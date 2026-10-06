-- =============================================================================
-- Workflow · 003 · Materials and inventory ledger
--
-- Integrity model (docs/ARCHITECTURE.md §6):
--   * inventory_movements is an append-only ledger.
--   * materials.stock_on_hand / stock_reserved / avg_cost / last_cost are cached
--     balances that ONLY apply_stock_movement() may change. It locks the
--     material row (FOR UPDATE), validates, writes the movement and updates the
--     balances inside the caller's transaction.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Materials
-- -----------------------------------------------------------------------------
create table public.materials (
  id                  uuid primary key default gen_random_uuid(),
  sku                 text not null unique check (sku = upper(btrim(sku)) and sku <> ''),
  name                text not null check (btrim(name) <> ''),
  description         text,
  category_id         uuid not null references public.categories (id),
  base_unit_id        uuid not null references public.units (id),
  avg_cost            numeric(18, 4) not null default 0 check (avg_cost >= 0),
  last_cost           numeric(18, 4) not null default 0 check (last_cost >= 0),
  stock_on_hand       numeric(14, 4) not null default 0,
  stock_reserved      numeric(14, 4) not null default 0 check (stock_reserved >= 0),
  stock_available     numeric(14, 4) generated always as (stock_on_hand - stock_reserved) stored,
  min_stock           numeric(14, 4) not null default 0 check (min_stock >= 0),
  max_stock           numeric(14, 4) check (max_stock is null or max_stock >= min_stock),
  location_id         uuid references public.locations (id),
  primary_supplier_id uuid references public.suppliers (id),
  tracks_remnants     boolean not null default false,
  is_active           boolean not null default true,
  external_source     text,
  external_id         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  unique (external_source, external_id)
);

comment on column public.materials.stock_on_hand is 'Physical stock in base unit. Changed only by apply_stock_movement().';
comment on column public.materials.stock_reserved is 'Stock committed to work orders. Changed only by apply_stock_movement().';
comment on column public.materials.avg_cost is 'Weighted moving average cost per base unit.';

create index materials_name_idx on public.materials (lower(name));
create index materials_category_idx on public.materials (category_id);
create index materials_active_idx on public.materials (is_active);

alter table public.unit_conversions
  add constraint unit_conversions_material_id_fkey
  foreign key (material_id) references public.materials (id);

-- -----------------------------------------------------------------------------
-- Inventory ledger
-- -----------------------------------------------------------------------------
create table public.inventory_movements (
  id                uuid primary key default gen_random_uuid(),
  seq               bigint generated always as identity unique,
  material_id       uuid not null references public.materials (id),
  movement_type     public.movement_type not null,
  quantity          numeric(14, 4) not null check (quantity > 0),
  on_hand_delta     numeric(14, 4) not null,
  reserved_delta    numeric(14, 4) not null,
  on_hand_before    numeric(14, 4) not null,
  on_hand_after     numeric(14, 4) not null,
  reserved_before   numeric(14, 4) not null,
  reserved_after    numeric(14, 4) not null check (reserved_after >= 0),
  unit_cost         numeric(18, 4) check (unit_cost >= 0),
  total_cost        numeric(18, 4),
  avg_cost_before   numeric(18, 4) not null,
  avg_cost_after    numeric(18, 4) not null,
  work_order_id     uuid, -- FK added in 004
  source_table      text,
  source_id         uuid,
  reference         text,
  notes             text,
  negative_override boolean not null default false,
  occurred_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id),

  check (on_hand_after = on_hand_before + on_hand_delta),
  check (reserved_after = reserved_before + reserved_delta),
  check (
    case movement_type
      when 'entry'               then on_hand_delta = quantity  and reserved_delta = 0
      when 'return'              then on_hand_delta = quantity  and reserved_delta = 0
      when 'adjustment_in'       then on_hand_delta = quantity  and reserved_delta = 0
      when 'exit'                then on_hand_delta = -quantity and reserved_delta = 0
      when 'adjustment_out'      then on_hand_delta = -quantity and reserved_delta = 0
      when 'reservation'         then on_hand_delta = 0 and reserved_delta = quantity
      when 'reservation_release' then on_hand_delta = 0 and reserved_delta = -quantity
      when 'consumption'         then on_hand_delta = -quantity and reserved_delta between -quantity and 0
      when 'waste'               then on_hand_delta = -quantity and reserved_delta between -quantity and 0
    end
  )
);

comment on table public.inventory_movements is 'Append-only inventory ledger (kardex). Never updated or deleted.';

create index inventory_movements_material_idx on public.inventory_movements (material_id, seq);
create index inventory_movements_work_order_idx on public.inventory_movements (work_order_id) where work_order_id is not null;
create index inventory_movements_type_date_idx on public.inventory_movements (movement_type, occurred_at);
create index inventory_movements_source_idx on public.inventory_movements (source_table, source_id);

create trigger inventory_movements_immutable
  before update or delete on public.inventory_movements
  for each row execute function public.block_mutation();

-- -----------------------------------------------------------------------------
-- Receipts (Entradas)
-- -----------------------------------------------------------------------------
create table public.inventory_receipts (
  id             uuid primary key default gen_random_uuid(),
  number         text not null unique,
  receipt_date   date not null default current_date,
  supplier_id    uuid references public.suppliers (id),
  invoice_number text,
  notes          text,
  total_cost     numeric(18, 4) not null default 0,
  voided_at      timestamptz,
  voided_by      uuid references public.profiles (id),
  void_reason    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id),
  updated_by     uuid references public.profiles (id),
  check ((voided_at is null) = (void_reason is null))
);

create index inventory_receipts_date_idx on public.inventory_receipts (receipt_date desc);
create index inventory_receipts_supplier_idx on public.inventory_receipts (supplier_id);

create table public.inventory_receipt_lines (
  id                uuid primary key default gen_random_uuid(),
  receipt_id        uuid not null references public.inventory_receipts (id),
  line_no           smallint not null check (line_no > 0),
  material_id       uuid not null references public.materials (id),
  unit_id           uuid not null references public.units (id),
  quantity          numeric(14, 4) not null check (quantity > 0),
  conversion_factor numeric(18, 8) not null default 1 check (conversion_factor > 0),
  base_quantity     numeric(14, 4) not null check (base_quantity > 0),
  unit_cost         numeric(18, 4) not null check (unit_cost >= 0),
  line_total        numeric(18, 4) not null,
  movement_id       uuid not null references public.inventory_movements (id),
  notes             text,
  unique (receipt_id, line_no)
);

create index inventory_receipt_lines_material_idx on public.inventory_receipt_lines (material_id);

-- -----------------------------------------------------------------------------
-- Adjustments (including opening balances)
-- -----------------------------------------------------------------------------
create table public.inventory_adjustments (
  id                 uuid primary key default gen_random_uuid(),
  number             text not null unique,
  material_id        uuid not null references public.materials (id),
  movement_type      public.movement_type not null check (movement_type in ('adjustment_in', 'adjustment_out')),
  quantity           numeric(14, 4) not null check (quantity > 0),
  unit_cost          numeric(18, 4) not null check (unit_cost >= 0),
  reason             text not null check (btrim(reason) <> ''),
  notes              text,
  is_opening_balance boolean not null default false,
  movement_id        uuid not null references public.inventory_movements (id),
  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id)
);

create index inventory_adjustments_material_idx on public.inventory_adjustments (material_id);

-- -----------------------------------------------------------------------------
-- Triggers on materials / receipts
-- -----------------------------------------------------------------------------

-- Balances and costs can only change through apply_stock_movement(), which sets
-- the transaction-local flag workflow.inventory_write = 'on'. The base unit
-- cannot change once the material has movements (BR INV-08).
create or replace function public.guard_material_balances()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('workflow.inventory_write', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.stock_on_hand <> 0 or new.stock_reserved <> 0 or new.avg_cost <> 0 or new.last_cost <> 0 then
      raise exception 'Un material nuevo inicia sin existencia. Registre la existencia inicial como movimiento.'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.stock_on_hand  is distinct from old.stock_on_hand
  or new.stock_reserved is distinct from old.stock_reserved
  or new.avg_cost       is distinct from old.avg_cost
  or new.last_cost      is distinct from old.last_cost then
    raise exception 'El stock y los costos solo cambian mediante movimientos de inventario.'
      using errcode = 'P0001';
  end if;

  if new.base_unit_id is distinct from old.base_unit_id
     and exists (select 1 from public.inventory_movements m where m.material_id = old.id) then
    raise exception 'No se puede cambiar la unidad base de un material que ya tiene movimientos.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger materials_guard_balances
  before insert or update on public.materials
  for each row execute function public.guard_material_balances();

create trigger materials_audit_fields
  before insert or update on public.materials
  for each row execute function public.set_audit_fields();

create trigger materials_audit
  after insert or update on public.materials
  for each row execute function public.audit_row_change(
    'stock_on_hand', 'stock_reserved', 'stock_available', 'avg_cost', 'last_cost'
  );

create trigger materials_no_delete
  before delete on public.materials
  for each row execute function public.prevent_delete();

create trigger inventory_receipts_audit_fields
  before insert or update on public.inventory_receipts
  for each row execute function public.set_audit_fields();

create trigger inventory_receipts_no_delete
  before delete on public.inventory_receipts
  for each row execute function public.prevent_delete();

create trigger inventory_receipt_lines_immutable
  before update or delete on public.inventory_receipt_lines
  for each row execute function public.block_mutation();

create trigger inventory_adjustments_immutable
  before update or delete on public.inventory_adjustments
  for each row execute function public.block_mutation();

-- -----------------------------------------------------------------------------
-- Stock engine (internal — not executable by API roles)
-- -----------------------------------------------------------------------------
create or replace function public.apply_stock_movement(
  p_material_id       uuid,
  p_movement_type     public.movement_type,
  p_quantity          numeric,
  p_unit_cost         numeric default null,
  p_reserved_consumed numeric default 0,
  p_work_order_id     uuid default null,
  p_source_table      text default null,
  p_source_id         uuid default null,
  p_reference         text default null,
  p_notes             text default null,
  p_occurred_at       timestamptz default now(),
  p_allow_negative    boolean default false
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mat            public.materials%rowtype;
  v_unit           public.units%rowtype;
  v_on_delta       numeric := 0;
  v_res_delta      numeric := 0;
  v_new_on_hand    numeric;
  v_new_reserved   numeric;
  v_unit_cost      numeric;
  v_new_avg        numeric;
  v_new_last       numeric;
  v_override       boolean := false;
  v_movement       public.inventory_movements%rowtype;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.' using errcode = 'P0001';
  end if;

  -- Serialise every stock change on this material.
  select * into v_mat from public.materials where id = p_material_id for update;
  if not found then
    raise exception 'Material no encontrado.' using errcode = 'P0001';
  end if;

  select * into v_unit from public.units where id = v_mat.base_unit_id;
  if p_quantity <> round(p_quantity, v_unit.decimals) then
    raise exception 'La cantidad de % admite como máximo % decimales (%).',
      v_mat.name, v_unit.decimals, v_unit.name
      using errcode = 'P0001';
  end if;

  if not v_mat.is_active and p_movement_type in ('entry', 'reservation', 'consumption') then
    raise exception 'El material % está inactivo.', v_mat.sku using errcode = 'P0001';
  end if;

  -- Effect on physical and reserved balances.
  case p_movement_type
    when 'entry', 'return', 'adjustment_in' then
      v_on_delta := p_quantity;
    when 'exit', 'adjustment_out' then
      v_on_delta := -p_quantity;
    when 'reservation' then
      v_res_delta := p_quantity;
    when 'reservation_release' then
      v_res_delta := -p_quantity;
    when 'consumption', 'waste' then
      if coalesce(p_reserved_consumed, 0) < 0 or coalesce(p_reserved_consumed, 0) > p_quantity then
        raise exception 'La cantidad reservada a descontar no es válida.' using errcode = 'P0001';
      end if;
      v_on_delta  := -p_quantity;
      v_res_delta := -coalesce(p_reserved_consumed, 0);
  end case;

  v_new_on_hand  := v_mat.stock_on_hand + v_on_delta;
  v_new_reserved := v_mat.stock_reserved + v_res_delta;

  if v_new_reserved < 0 then
    raise exception 'No se puede liberar más de lo reservado de % (reservado: %).',
      v_mat.name, v_mat.stock_reserved
      using errcode = 'P0001';
  end if;

  -- BR INV-04 / INV-05: available and physical stock cannot go negative,
  -- unless an authorised user explicitly allows it.
  if ((v_on_delta - v_res_delta) < 0 and v_new_on_hand - v_new_reserved < 0)
     or (v_on_delta < 0 and v_new_on_hand < 0) then
    if not coalesce(p_allow_negative, false) then
      raise exception 'Stock insuficiente de % (%). Disponible: % %, requerido: % %.',
        v_mat.name, v_mat.sku,
        trim_scale(v_mat.stock_available), v_unit.symbol,
        trim_scale(p_quantity), v_unit.symbol
        using errcode = 'P0001';
    end if;
    perform public.require_permission('inventory.allow_negative');
    v_override := true;
  end if;

  -- Valuation (BR CST-01..04).
  v_new_avg  := v_mat.avg_cost;
  v_new_last := v_mat.last_cost;

  if p_movement_type in ('entry', 'adjustment_in', 'return') then
    v_unit_cost := coalesce(p_unit_cost, v_mat.avg_cost);
    if v_unit_cost < 0 then
      raise exception 'El costo unitario no puede ser negativo.' using errcode = 'P0001';
    end if;
    if v_mat.stock_on_hand <= 0 then
      v_new_avg := v_unit_cost;
    else
      v_new_avg := (v_mat.stock_on_hand * v_mat.avg_cost + p_quantity * v_unit_cost)
                   / (v_mat.stock_on_hand + p_quantity);
    end if;
    -- Last known purchase cost: every entry, or an opening/positive adjustment
    -- while no purchase cost is known yet (BR CST-02).
    if p_movement_type = 'entry' or (p_movement_type = 'adjustment_in' and v_mat.last_cost = 0) then
      v_new_last := v_unit_cost;
    end if;
  elsif p_movement_type = 'exit' and p_unit_cost is not null then
    -- Reversal of an entry at its original cost (e.g. voided receipt).
    v_unit_cost := p_unit_cost;
    if v_new_on_hand > 0 then
      v_new_avg := greatest(0, (v_mat.stock_on_hand * v_mat.avg_cost - p_quantity * p_unit_cost) / v_new_on_hand);
    end if;
  elsif p_movement_type in ('exit', 'adjustment_out', 'consumption', 'waste') then
    v_unit_cost := v_mat.avg_cost;
  else
    v_unit_cost := null; -- reservations carry no value
  end if;

  insert into public.inventory_movements (
    material_id, movement_type, quantity,
    on_hand_delta, reserved_delta,
    on_hand_before, on_hand_after,
    reserved_before, reserved_after,
    unit_cost, total_cost,
    avg_cost_before, avg_cost_after,
    work_order_id, source_table, source_id, reference, notes,
    negative_override, occurred_at, created_by
  ) values (
    p_material_id, p_movement_type, p_quantity,
    v_on_delta, v_res_delta,
    v_mat.stock_on_hand, v_new_on_hand,
    v_mat.stock_reserved, v_new_reserved,
    v_unit_cost, round(p_quantity * v_unit_cost, 4),
    v_mat.avg_cost, round(v_new_avg, 4),
    p_work_order_id, p_source_table, p_source_id, p_reference, p_notes,
    v_override, coalesce(p_occurred_at, now()), auth.uid()
  )
  returning * into v_movement;

  perform set_config('workflow.inventory_write', 'on', true);
  update public.materials
     set stock_on_hand  = v_new_on_hand,
         stock_reserved = v_new_reserved,
         avg_cost       = round(v_new_avg, 4),
         last_cost      = v_new_last
   where id = p_material_id;
  perform set_config('workflow.inventory_write', '', true);

  if v_override then
    perform public.log_audit_event(
      'inventory.negative_override', 'materials', p_material_id::text,
      format('Autorizó stock negativo en %s (%s): %s %s', v_mat.name, p_movement_type, trim_scale(p_quantity), v_unit.symbol),
      to_jsonb(v_movement)
    );
  end if;

  return v_movement;
end;
$$;

comment on function public.apply_stock_movement is
  'Internal stock engine. Locks the material, validates invariants, writes the ledger row and updates balances.';

-- -----------------------------------------------------------------------------
-- RPC: create a material with optional opening balance (atomic)
-- -----------------------------------------------------------------------------
create or replace function public.create_material(
  p_name                text,
  p_category_id         uuid,
  p_base_unit_id        uuid,
  p_sku                 text default null,
  p_description         text default null,
  p_min_stock           numeric default 0,
  p_max_stock           numeric default null,
  p_location_id         uuid default null,
  p_primary_supplier_id uuid default null,
  p_tracks_remnants     boolean default false,
  p_opening_quantity    numeric default 0,
  p_opening_unit_cost   numeric default 0
)
returns public.materials
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sku        text := nullif(upper(btrim(coalesce(p_sku, ''))), '');
  v_material   public.materials%rowtype;
  v_adjustment uuid;
  v_number     text;
  v_movement   public.inventory_movements%rowtype;
begin
  perform public.require_permission('materials.manage');

  if v_sku is null then
    loop
      v_sku := public.next_document_number('material');
      exit when not exists (select 1 from public.materials where sku = v_sku);
    end loop;
  elsif exists (select 1 from public.materials where sku = v_sku) then
    raise exception 'Ya existe un material con el código %.', v_sku using errcode = '23505';
  end if;

  insert into public.materials (
    sku, name, description, category_id, base_unit_id, min_stock, max_stock,
    location_id, primary_supplier_id, tracks_remnants
  ) values (
    v_sku, btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_category_id, p_base_unit_id,
    coalesce(p_min_stock, 0), p_max_stock, p_location_id, p_primary_supplier_id,
    coalesce(p_tracks_remnants, false)
  )
  returning * into v_material;

  if coalesce(p_opening_quantity, 0) > 0 then
    if coalesce(p_opening_unit_cost, 0) < 0 then
      raise exception 'El costo unitario inicial no puede ser negativo.' using errcode = 'P0001';
    end if;

    v_adjustment := gen_random_uuid();
    v_number := public.next_document_number('inventory_adjustment');

    v_movement := public.apply_stock_movement(
      p_material_id  => v_material.id,
      p_movement_type => 'adjustment_in',
      p_quantity     => p_opening_quantity,
      p_unit_cost    => coalesce(p_opening_unit_cost, 0),
      p_source_table => 'inventory_adjustments',
      p_source_id    => v_adjustment,
      p_reference    => v_number,
      p_notes        => 'Inventario inicial'
    );

    insert into public.inventory_adjustments (
      id, number, material_id, movement_type, quantity, unit_cost, reason,
      is_opening_balance, movement_id, created_by
    ) values (
      v_adjustment, v_number, v_material.id, 'adjustment_in', p_opening_quantity,
      coalesce(p_opening_unit_cost, 0), 'Inventario inicial', true, v_movement.id, auth.uid()
    );

    select * into v_material from public.materials where id = v_material.id;
  end if;

  return v_material;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: post a receipt with one or more lines
--   p_lines: [{ "material_id": uuid, "quantity": num, "unit_cost": num,
--               "unit_id": uuid (optional, must be the base unit in v1),
--               "notes": text (optional) }]
-- -----------------------------------------------------------------------------
create or replace function public.post_inventory_receipt(
  p_lines          jsonb,
  p_receipt_date   date default current_date,
  p_supplier_id    uuid default null,
  p_invoice_number text default null,
  p_notes          text default null
)
returns public.inventory_receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt  public.inventory_receipts%rowtype;
  v_line     record;
  v_line_id  uuid;
  v_movement public.inventory_movements%rowtype;
  v_unit_id  uuid;
  v_total    numeric := 0;
  v_count    integer := 0;
begin
  perform public.require_permission('inventory.receive');

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'La entrada debe tener al menos una línea.' using errcode = 'P0001';
  end if;

  insert into public.inventory_receipts (number, receipt_date, supplier_id, invoice_number, notes)
  values (
    public.next_document_number('inventory_receipt'),
    coalesce(p_receipt_date, current_date),
    p_supplier_id,
    nullif(btrim(coalesce(p_invoice_number, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_receipt;

  -- Lines are applied in material order so concurrent receipts lock rows in
  -- the same order (no deadlocks); line_no keeps the order the user entered.
  for v_line in
    select l.ordinality::smallint as line_no,
           (l.value ->> 'material_id')::uuid as material_id,
           nullif(l.value ->> 'unit_id', '')::uuid as unit_id,
           (l.value ->> 'quantity')::numeric as quantity,
           (l.value ->> 'unit_cost')::numeric as unit_cost,
           nullif(btrim(coalesce(l.value ->> 'notes', '')), '') as notes
    from jsonb_array_elements(p_lines) with ordinality as l (value, ordinality)
    order by (l.value ->> 'material_id')::uuid, l.ordinality
  loop
    if v_line.material_id is null then
      raise exception 'Línea %: seleccione un material.', v_line.line_no using errcode = 'P0001';
    end if;
    if v_line.unit_cost is null or v_line.unit_cost < 0 then
      raise exception 'Línea %: el costo unitario debe ser cero o mayor.', v_line.line_no using errcode = 'P0001';
    end if;

    select m.base_unit_id into v_unit_id from public.materials m where m.id = v_line.material_id;
    if v_unit_id is null then
      raise exception 'Línea %: material no encontrado.', v_line.line_no using errcode = 'P0001';
    end if;
    if v_line.unit_id is not null and v_line.unit_id <> v_unit_id then
      raise exception 'Línea %: por ahora la entrada debe registrarse en la unidad base del material.',
        v_line.line_no using errcode = 'P0001';
    end if;

    v_line_id := gen_random_uuid();
    v_movement := public.apply_stock_movement(
      p_material_id   => v_line.material_id,
      p_movement_type => 'entry',
      p_quantity      => v_line.quantity,
      p_unit_cost     => v_line.unit_cost,
      p_source_table  => 'inventory_receipt_lines',
      p_source_id     => v_line_id,
      p_reference     => concat_ws(' · ', v_receipt.number, 'Factura ' || v_receipt.invoice_number),
      p_notes         => v_line.notes,
      p_occurred_at   => now()
    );

    insert into public.inventory_receipt_lines (
      id, receipt_id, line_no, material_id, unit_id, quantity, conversion_factor,
      base_quantity, unit_cost, line_total, movement_id, notes
    ) values (
      v_line_id, v_receipt.id, v_line.line_no, v_line.material_id, v_unit_id, v_line.quantity, 1,
      v_line.quantity, v_line.unit_cost, round(v_line.quantity * v_line.unit_cost, 4), v_movement.id, v_line.notes
    );

    v_total := v_total + round(v_line.quantity * v_line.unit_cost, 4);
    v_count := v_count + 1;
  end loop;

  update public.inventory_receipts set total_cost = v_total where id = v_receipt.id
  returning * into v_receipt;

  perform public.log_audit_event(
    'inventory.receipt.posted', 'inventory_receipts', v_receipt.id::text,
    format('Registró la entrada %s (%s línea(s), total %s)', v_receipt.number, v_count, round(v_total, 2)),
    to_jsonb(v_receipt)
  );

  return v_receipt;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: inventory adjustment (positive or negative) with mandatory reason
-- -----------------------------------------------------------------------------
create or replace function public.create_inventory_adjustment(
  p_material_id    uuid,
  p_movement_type  public.movement_type,
  p_quantity       numeric,
  p_reason         text,
  p_unit_cost      numeric default null,
  p_notes          text default null,
  p_allow_negative boolean default false
)
returns public.inventory_adjustments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id         uuid := gen_random_uuid();
  v_number     text;
  v_movement   public.inventory_movements%rowtype;
  v_adjustment public.inventory_adjustments%rowtype;
begin
  perform public.require_permission('inventory.adjust');

  if p_movement_type not in ('adjustment_in', 'adjustment_out') then
    raise exception 'Tipo de ajuste no válido.' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Indique el motivo del ajuste.' using errcode = 'P0001';
  end if;

  v_number := public.next_document_number('inventory_adjustment');

  v_movement := public.apply_stock_movement(
    p_material_id    => p_material_id,
    p_movement_type  => p_movement_type,
    p_quantity       => p_quantity,
    p_unit_cost      => case when p_movement_type = 'adjustment_in' then p_unit_cost end,
    p_source_table   => 'inventory_adjustments',
    p_source_id      => v_id,
    p_reference      => v_number,
    p_notes          => concat_ws(' — ', btrim(p_reason), nullif(btrim(coalesce(p_notes, '')), '')),
    p_allow_negative => p_allow_negative
  );

  insert into public.inventory_adjustments (
    id, number, material_id, movement_type, quantity, unit_cost, reason, notes, movement_id, created_by
  ) values (
    v_id, v_number, p_material_id, p_movement_type, p_quantity, v_movement.unit_cost,
    btrim(p_reason), nullif(btrim(coalesce(p_notes, '')), ''), v_movement.id, auth.uid()
  )
  returning * into v_adjustment;

  perform public.log_audit_event(
    'inventory.adjustment.created', 'inventory_adjustments', v_id::text,
    format('Registró el ajuste %s (%s %s): %s', v_number,
      case when p_movement_type = 'adjustment_in' then '+' else '-' end,
      trim_scale(p_quantity), btrim(p_reason)),
    to_jsonb(v_adjustment)
  );

  return v_adjustment;
end;
$$;
