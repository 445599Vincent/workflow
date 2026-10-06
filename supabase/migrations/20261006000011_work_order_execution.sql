-- =============================================================================
-- Workflow · 011 · Work order execution (Phase 3)
--
-- Reservations, real consumption, waste, status transitions and closing.
-- Rules: docs/BUSINESS_RULES.md §6 (OT, PLN, RES, CON, MER, CIE).
-- Decisions: docs/ARCHITECTURE.md D-024..D-027.
--
-- Every RPC locks the work order row first and only then touches materials
-- (through apply_stock_movement, in material id order) — D-027.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Planned-material lines: unplanned lines (D-024) and live actual cost (D-026)
-- -----------------------------------------------------------------------------
alter table public.work_order_materials
  add column if not exists is_planned boolean not null default true,
  add column if not exists actual_cost numeric(18, 4) not null default 0;

alter table public.work_order_materials
  drop constraint if exists work_order_materials_planned_quantity_check;

alter table public.work_order_materials
  add constraint work_order_materials_planned_quantity_check
  check (planned_quantity >= 0 and (planned_quantity > 0 or not is_planned));

comment on column public.work_order_materials.is_planned is
  'False for lines created by consuming or wasting a material that was not planned (D-024).';
comment on column public.work_order_materials.actual_cost is
  'Cost of consumption + waste on this line (frozen movement costs). Maintained by RPCs.';

create or replace function public.work_order_materials_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.work_order_status;
begin
  select status into v_status from public.work_orders where id = coalesce(new.work_order_id, old.work_order_id);
  if v_status in ('completed', 'cancelled') then
    raise exception 'No se pueden modificar los materiales de una orden cerrada.' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    if old.reserved_quantity > 0 or old.consumed_quantity > 0 or old.waste_quantity > 0 then
      raise exception 'No se puede quitar un material con reservas, consumos o mermas registradas.'
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if coalesce(current_setting('workflow.inventory_write', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.reserved_quantity := 0;
      new.consumed_quantity := 0;
      new.waste_quantity := 0;
      new.actual_cost := 0;
      new.is_planned := true;
      if new.estimated_unit_cost is null or new.estimated_unit_cost = 0 then
        select m.avg_cost into new.estimated_unit_cost from public.materials m where m.id = new.material_id;
      end if;
    else
      new.work_order_id := old.work_order_id;
      new.material_id := old.material_id;
      new.reserved_quantity := old.reserved_quantity;
      new.consumed_quantity := old.consumed_quantity;
      new.waste_quantity := old.waste_quantity;
      new.actual_cost := old.actual_cost;
      -- Giving an unplanned line a quantity turns it into a planned one.
      new.is_planned := old.is_planned or new.planned_quantity > 0;
      if not old.is_planned and new.is_planned
         and (new.estimated_unit_cost is null or new.estimated_unit_cost = 0) then
        select m.avg_cost into new.estimated_unit_cost from public.materials m where m.id = new.material_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Timeline entries for planning changes made by users (RPCs log their own).
create or replace function public.work_order_materials_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row  public.work_order_materials%rowtype := coalesce(new, old);
  v_name text;
begin
  if coalesce(current_setting('workflow.inventory_write', true), '') = 'on' then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.planned_quantity is not distinct from old.planned_quantity then
    return null;
  end if;

  select m.name into v_name from public.materials m where m.id = v_row.material_id;
  insert into public.work_order_events (work_order_id, event_type, payload, created_by)
  values (
    v_row.work_order_id,
    case tg_op when 'INSERT' then 'material_planned' when 'UPDATE' then 'material_updated' else 'material_removed' end,
    jsonb_build_object(
      'material_id', v_row.material_id,
      'material', v_name,
      'quantity', v_row.planned_quantity,
      'previous_quantity', case when tg_op = 'UPDATE' then old.planned_quantity end
    ),
    auth.uid()
  );
  return null;
end;
$$;

create trigger work_order_materials_timeline
  after insert or update or delete on public.work_order_materials
  for each row execute function public.work_order_materials_log_event();

-- -----------------------------------------------------------------------------
-- Status transitions (OT-02 / OT-03, D-025)
-- -----------------------------------------------------------------------------
create or replace function public.work_order_status_rank(p_status public.work_order_status)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'draft' then 0
    when 'pending' then 1
    when 'planned' then 2
    when 'in_production' then 3
    when 'in_installation' then 4
    when 'completed' then 5
    when 'cancelled' then 6
  end;
$$;

create or replace function public.work_orders_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closing        boolean := coalesce(current_setting('workflow.work_order_close', true), '') = 'on';
  v_updating_costs boolean := coalesce(current_setting('workflow.work_order_costs', true), '') = 'on';
  v_from           integer;
  v_to             integer;
begin
  if tg_op = 'INSERT' then
    new.number := public.next_document_number('work_order');
    if new.status not in ('draft', 'pending') then
      raise exception 'Una orden nueva debe iniciar en Borrador o Pendiente.' using errcode = 'P0001';
    end if;
    new.started_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
    new.cancel_reason := null;
    new.estimated_material_cost := 0;
    new.actual_material_cost := 0;
    return new;
  end if;

  new.number := old.number;

  if not (v_closing or v_updating_costs) then
    new.estimated_material_cost := old.estimated_material_cost;
    new.actual_material_cost := old.actual_material_cost;
  end if;

  if new.status is distinct from old.status then
    v_from := public.work_order_status_rank(old.status);
    v_to := public.work_order_status_rank(new.status);

    if old.status in ('completed', 'cancelled') then
      -- Reopening (administrators): back to production.
      if not public.has_permission('work_orders.reopen') then
        raise exception 'La orden % está cerrada. Solo un administrador puede reabrirla.', old.number
          using errcode = '42501';
      end if;
      if new.status <> 'in_production' then
        raise exception 'Una orden reabierta vuelve a En producción.' using errcode = 'P0001';
      end if;
    elsif new.status in ('completed', 'cancelled') then
      if not v_closing then
        raise exception 'Use la acción de terminar o cancelar la orden.' using errcode = 'P0001';
      end if;
      if new.status = 'completed' and old.status not in ('in_production', 'in_installation') then
        raise exception 'Solo se puede terminar una orden en producción o en instalación.'
          using errcode = 'P0001';
      end if;
    elsif v_to < v_from - 1 then
      raise exception 'Una orden solo puede retroceder un paso.' using errcode = 'P0001';
    end if;

    if new.status = 'in_production' and old.started_at is null then
      new.started_at := now();
    else
      new.started_at := old.started_at;
    end if;
    new.completed_at := case when new.status = 'completed' then now() end;
    new.cancelled_at := case when new.status = 'cancelled' then now() end;
    if new.status <> 'cancelled' then
      new.cancel_reason := null;
    end if;
  else
    new.started_at := old.started_at;
    new.completed_at := old.completed_at;
    new.cancelled_at := old.cancelled_at;
    new.cancel_reason := old.cancel_reason;
  end if;

  return new;
end;
$$;

-- Status events carry the optional note given to change_work_order_status.
create or replace function public.work_orders_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.work_order_events (work_order_id, event_type, to_status, created_by)
    values (new.id, 'created', new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.work_order_events (work_order_id, event_type, from_status, to_status, note, created_by)
    values (
      new.id, 'status_changed', old.status, new.status,
      nullif(current_setting('workflow.status_note', true), ''),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

-- Status only changes through change_work_order_status (D-025).
revoke update (status, cancel_reason) on public.work_orders from authenticated;

-- -----------------------------------------------------------------------------
-- Internal helpers
-- -----------------------------------------------------------------------------

-- Locks the order and checks it accepts the given kind of operation.
create or replace function public.lock_work_order(p_work_order_id uuid, p_allowed public.work_order_status[])
returns public.work_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.work_orders%rowtype;
begin
  select * into v_order from public.work_orders where id = p_work_order_id for update;
  if not found then
    raise exception 'Orden de trabajo no encontrada.' using errcode = 'P0001';
  end if;
  if not (v_order.status = any (p_allowed)) then
    raise exception 'La orden % está en estado % y no admite esta operación.',
      v_order.number,
      case v_order.status
        when 'draft' then 'Borrador' when 'pending' then 'Pendiente' when 'planned' then 'Planificada'
        when 'in_production' then 'En producción' when 'in_installation' then 'En instalación'
        when 'completed' then 'Terminada' else 'Cancelada'
      end
      using errcode = 'P0001';
  end if;
  return v_order;
end;
$$;

-- Recomputes the order's actual material cost from its lines.
create or replace function public.refresh_work_order_actual_cost(p_work_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('workflow.work_order_costs', 'on', true);
  update public.work_orders wo
     set actual_material_cost = coalesce((
           select sum(wom.actual_cost) from public.work_order_materials wom
           where wom.work_order_id = p_work_order_id
         ), 0)
   where wo.id = p_work_order_id;
  perform set_config('workflow.work_order_costs', '', true);
end;
$$;

-- Releases (part of) the active reservations of one line, newest first.
create or replace function public.release_line_reservations(
  p_line  public.work_order_materials,
  p_order public.work_orders,
  p_quantity numeric,
  p_notes text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left    numeric := least(coalesce(p_quantity, p_line.reserved_quantity), p_line.reserved_quantity);
  v_total   numeric := v_left;
  v_res     record;
  v_take    numeric;
begin
  if v_left <= 0 then
    return 0;
  end if;

  perform public.apply_stock_movement(
    p_material_id   => p_line.material_id,
    p_movement_type => 'reservation_release',
    p_quantity      => v_total,
    p_work_order_id => p_order.id,
    p_source_table  => 'work_order_materials',
    p_source_id     => p_line.id,
    p_reference     => p_order.number,
    p_notes         => p_notes
  );

  perform set_config('workflow.inventory_write', 'on', true);
  for v_res in
    select id, remaining_quantity from public.material_reservations
    where work_order_material_id = p_line.id and status = 'active'
    order by created_at desc
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_res.remaining_quantity, v_left);
    update public.material_reservations
       set remaining_quantity = remaining_quantity - v_take,
           status = case when remaining_quantity - v_take = 0 then 'released'::public.reservation_status else status end,
           released_at = case when remaining_quantity - v_take = 0 then now() else released_at end
     where id = v_res.id;
    v_left := v_left - v_take;
  end loop;

  update public.work_order_materials
     set reserved_quantity = reserved_quantity - v_total
   where id = p_line.id;
  perform set_config('workflow.inventory_write', '', true);

  return v_total;
end;
$$;

-- Finds the order line for a material, creating an unplanned one if needed (D-024).
create or replace function public.ensure_work_order_line(p_order public.work_orders, p_material_id uuid)
returns public.work_order_materials
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line public.work_order_materials%rowtype;
begin
  select * into v_line from public.work_order_materials
   where work_order_id = p_order.id and material_id = p_material_id
   for update;
  if found then
    return v_line;
  end if;

  perform set_config('workflow.inventory_write', 'on', true);
  insert into public.work_order_materials (work_order_id, material_id, planned_quantity, estimated_unit_cost, is_planned)
  values (p_order.id, p_material_id, 0, 0, false)
  returning * into v_line;
  perform set_config('workflow.inventory_write', '', true);

  insert into public.work_order_events (work_order_id, event_type, payload, created_by)
  values (p_order.id, 'material_unplanned',
          jsonb_build_object('material_id', p_material_id,
                             'material', (select name from public.materials where id = p_material_id)),
          auth.uid());
  return v_line;
end;
$$;

-- Shared body of consume_material / register_waste.
create or replace function public.use_material_on_order(
  p_work_order_id uuid,
  p_material_id   uuid,
  p_quantity      numeric,
  p_kind          public.movement_type,
  p_reason        public.waste_reason,
  p_notes         text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order    public.work_orders%rowtype;
  v_line     public.work_order_materials%rowtype;
  v_movement public.inventory_movements%rowtype;
  v_from_res numeric;
  v_left     numeric;
  v_take     numeric;
  v_res      record;
  v_id       uuid := gen_random_uuid();
  v_notes    text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  perform public.require_permission('work_orders.consume');
  v_order := public.lock_work_order(p_work_order_id, array['in_production', 'in_installation']::public.work_order_status[]);

  if p_kind = 'waste' and p_reason = 'other' and v_notes is null then
    raise exception 'Describa el motivo de la merma.' using errcode = 'P0001';
  end if;

  v_line := public.ensure_work_order_line(v_order, p_material_id);
  v_from_res := least(coalesce(p_quantity, 0), v_line.reserved_quantity);

  v_movement := public.apply_stock_movement(
    p_material_id       => p_material_id,
    p_movement_type     => p_kind,
    p_quantity          => p_quantity,
    p_reserved_consumed => v_from_res,
    p_work_order_id     => v_order.id,
    p_source_table      => case when p_kind = 'waste' then 'waste_records' else 'material_consumptions' end,
    p_source_id         => v_id,
    p_reference         => v_order.number,
    p_notes             => v_notes
  );

  -- Draw the order's own reservations first, oldest first (RES-05).
  perform set_config('workflow.inventory_write', 'on', true);
  v_left := v_from_res;
  for v_res in
    select id, remaining_quantity from public.material_reservations
    where work_order_material_id = v_line.id and status = 'active'
    order by created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_res.remaining_quantity, v_left);
    update public.material_reservations
       set remaining_quantity = remaining_quantity - v_take,
           status = case when remaining_quantity - v_take = 0 then 'consumed'::public.reservation_status else status end
     where id = v_res.id;
    v_left := v_left - v_take;
  end loop;

  update public.work_order_materials
     set reserved_quantity = reserved_quantity - v_from_res,
         consumed_quantity = consumed_quantity + case when p_kind = 'consumption' then p_quantity else 0 end,
         waste_quantity    = waste_quantity    + case when p_kind = 'waste' then p_quantity else 0 end,
         actual_cost       = actual_cost + v_movement.total_cost
   where id = v_line.id;
  perform set_config('workflow.inventory_write', '', true);

  if p_kind = 'waste' then
    insert into public.waste_records (
      id, work_order_id, work_order_material_id, material_id, quantity, reason,
      unit_cost, total_cost, movement_id, notes
    ) values (
      v_id, v_order.id, v_line.id, p_material_id, p_quantity, p_reason,
      v_movement.unit_cost, v_movement.total_cost, v_movement.id, v_notes
    );
  else
    insert into public.material_consumptions (
      id, work_order_id, work_order_material_id, material_id, quantity,
      unit_cost, total_cost, movement_id, notes
    ) values (
      v_id, v_order.id, v_line.id, p_material_id, p_quantity,
      v_movement.unit_cost, v_movement.total_cost, v_movement.id, v_notes
    );
  end if;

  perform public.refresh_work_order_actual_cost(v_order.id);

  insert into public.work_order_events (work_order_id, event_type, payload, note, created_by)
  values (
    v_order.id,
    case when p_kind = 'waste' then 'waste' else 'consumed' end,
    jsonb_build_object(
      'material_id', p_material_id,
      'material', (select name from public.materials where id = p_material_id),
      'quantity', p_quantity,
      'from_reservation', v_from_res,
      'total_cost', v_movement.total_cost,
      'reason', p_reason
    ),
    v_notes,
    auth.uid()
  );

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Public RPCs
-- -----------------------------------------------------------------------------

-- RES-01..03: reserve planned material for an open order.
create or replace function public.reserve_material(
  p_work_order_material_id uuid,
  p_quantity               numeric,
  p_notes                  text default null
)
returns public.material_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line        public.work_order_materials%rowtype;
  v_order       public.work_orders%rowtype;
  v_movement    public.inventory_movements%rowtype;
  v_reservation public.material_reservations%rowtype;
  v_id          uuid := gen_random_uuid();
begin
  perform public.require_permission('work_orders.reserve');

  select * into v_line from public.work_order_materials where id = p_work_order_material_id;
  if not found then
    raise exception 'Material de la orden no encontrado.' using errcode = 'P0001';
  end if;

  v_order := public.lock_work_order(
    v_line.work_order_id,
    array['pending', 'planned', 'in_production', 'in_installation']::public.work_order_status[]
  );
  select * into v_line from public.work_order_materials where id = p_work_order_material_id for update;

  v_movement := public.apply_stock_movement(
    p_material_id   => v_line.material_id,
    p_movement_type => 'reservation',
    p_quantity      => p_quantity,
    p_work_order_id => v_order.id,
    p_source_table  => 'material_reservations',
    p_source_id     => v_id,
    p_reference     => v_order.number,
    p_notes         => nullif(btrim(coalesce(p_notes, '')), '')
  );

  perform set_config('workflow.inventory_write', 'on', true);
  insert into public.material_reservations (
    id, work_order_id, work_order_material_id, material_id, quantity, remaining_quantity, movement_id, notes
  ) values (
    v_id, v_order.id, v_line.id, v_line.material_id, p_quantity, p_quantity, v_movement.id,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_reservation;

  update public.work_order_materials
     set reserved_quantity = reserved_quantity + p_quantity
   where id = v_line.id;
  perform set_config('workflow.inventory_write', '', true);

  insert into public.work_order_events (work_order_id, event_type, payload, created_by)
  values (v_order.id, 'reserved',
          jsonb_build_object('material_id', v_line.material_id,
                             'material', (select name from public.materials where id = v_line.material_id),
                             'quantity', p_quantity),
          auth.uid());

  return v_reservation;
end;
$$;

-- RES-04: release part or all (p_quantity null) of a line's reservation.
create or replace function public.release_reservation(
  p_work_order_material_id uuid,
  p_quantity               numeric default null,
  p_notes                  text default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line     public.work_order_materials%rowtype;
  v_order    public.work_orders%rowtype;
  v_released numeric;
begin
  perform public.require_permission('work_orders.reserve');

  select * into v_line from public.work_order_materials where id = p_work_order_material_id;
  if not found then
    raise exception 'Material de la orden no encontrado.' using errcode = 'P0001';
  end if;
  v_order := public.lock_work_order(
    v_line.work_order_id,
    array['pending', 'planned', 'in_production', 'in_installation']::public.work_order_status[]
  );
  select * into v_line from public.work_order_materials where id = p_work_order_material_id for update;

  if v_line.reserved_quantity <= 0 then
    raise exception 'Este material no tiene reservas activas en la orden.' using errcode = 'P0001';
  end if;
  if p_quantity is not null and (p_quantity <= 0 or p_quantity > v_line.reserved_quantity) then
    raise exception 'Puede liberar como máximo % (lo reservado).', trim_scale(v_line.reserved_quantity)
      using errcode = 'P0001';
  end if;

  v_released := public.release_line_reservations(v_line, v_order, p_quantity, nullif(btrim(coalesce(p_notes, '')), ''));

  insert into public.work_order_events (work_order_id, event_type, payload, created_by)
  values (v_order.id, 'released',
          jsonb_build_object('material_id', v_line.material_id,
                             'material', (select name from public.materials where id = v_line.material_id),
                             'quantity', v_released),
          auth.uid());
  return v_released;
end;
$$;

-- CON-01/02: useful material actually used.
create or replace function public.consume_material(
  p_work_order_id uuid,
  p_material_id   uuid,
  p_quantity      numeric,
  p_notes         text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.use_material_on_order(p_work_order_id, p_material_id, p_quantity, 'consumption', null, p_notes);
$$;

-- MER-01..04: waste recorded independently from consumption.
create or replace function public.register_waste(
  p_work_order_id uuid,
  p_material_id   uuid,
  p_quantity      numeric,
  p_reason        public.waste_reason,
  p_notes         text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.use_material_on_order(p_work_order_id, p_material_id, p_quantity, 'waste', p_reason, p_notes);
$$;

-- OT-02/03/07, CIE-02: the only way to change an order's status.
create or replace function public.change_work_order_status(
  p_work_order_id uuid,
  p_status        public.work_order_status,
  p_note          text default null
)
returns public.work_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.work_orders%rowtype;
  v_line  public.work_order_materials%rowtype;
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_order from public.work_orders where id = p_work_order_id for update;
  if not found then
    raise exception 'Orden de trabajo no encontrada.' using errcode = 'P0001';
  end if;
  if v_order.status = p_status then
    return v_order;
  end if;

  if p_status = 'completed' then
    perform public.require_permission('work_orders.close');
  elsif v_order.status in ('completed', 'cancelled') then
    perform public.require_permission('work_orders.reopen');
  else
    perform public.require_permission('work_orders.manage');
  end if;

  if p_status = 'cancelled' and v_note is null then
    raise exception 'Indique el motivo de la cancelación.' using errcode = 'P0001';
  end if;

  -- Closing or cancelling releases what is still reserved (RES-06), in
  -- material order (D-027).
  if p_status in ('completed', 'cancelled') then
    for v_line in
      select * from public.work_order_materials
      where work_order_id = v_order.id and reserved_quantity > 0
      order by material_id
      for update
    loop
      perform public.release_line_reservations(
        v_line, v_order, null,
        case when p_status = 'completed' then 'Liberación al terminar la orden' else 'Liberación por cancelación' end
      );
    end loop;
    perform public.refresh_work_order_actual_cost(v_order.id);
    perform set_config('workflow.work_order_close', 'on', true);
  end if;

  perform set_config('workflow.status_note', coalesce(v_note, ''), true);
  update public.work_orders
     set status = p_status,
         cancel_reason = case when p_status = 'cancelled' then v_note else cancel_reason end
   where id = v_order.id
  returning * into v_order;
  perform set_config('workflow.status_note', '', true);
  perform set_config('workflow.work_order_close', '', true);

  return v_order;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke execute on function public.work_order_status_rank(public.work_order_status) from public, anon;
revoke execute on function public.lock_work_order(uuid, public.work_order_status[]) from public, anon, authenticated;
revoke execute on function public.refresh_work_order_actual_cost(uuid) from public, anon, authenticated;
revoke execute on function public.release_line_reservations(public.work_order_materials, public.work_orders, numeric, text) from public, anon, authenticated;
revoke execute on function public.ensure_work_order_line(public.work_orders, uuid) from public, anon, authenticated;
revoke execute on function public.use_material_on_order(uuid, uuid, numeric, public.movement_type, public.waste_reason, text) from public, anon, authenticated;
revoke execute on function public.work_order_materials_log_event() from public, anon, authenticated;

revoke execute on function public.reserve_material(uuid, numeric, text) from public, anon;
revoke execute on function public.release_reservation(uuid, numeric, text) from public, anon;
revoke execute on function public.consume_material(uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.register_waste(uuid, uuid, numeric, public.waste_reason, text) from public, anon;
revoke execute on function public.change_work_order_status(uuid, public.work_order_status, text) from public, anon;

grant execute on function public.reserve_material(uuid, numeric, text) to authenticated;
grant execute on function public.release_reservation(uuid, numeric, text) to authenticated;
grant execute on function public.consume_material(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.register_waste(uuid, uuid, numeric, public.waste_reason, text) to authenticated;
grant execute on function public.change_work_order_status(uuid, public.work_order_status, text) to authenticated;
