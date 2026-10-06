-- =============================================================================
-- Workflow · 004 · Work orders
-- Orders, timeline, planned materials, reservations, consumptions and waste.
-- The stock-changing RPCs (reserve, release, consume, waste, close) arrive in
-- Phase 3 and will reuse public.apply_stock_movement(). See BUSINESS_RULES §6.
-- =============================================================================

create table public.work_orders (
  id                      uuid primary key default gen_random_uuid(),
  number                  text not null unique,
  customer_id             uuid references public.customers (id),
  title                   text not null check (btrim(title) <> ''),
  description             text,
  status                  public.work_order_status not null default 'draft',
  priority                public.work_order_priority not null default 'normal',
  due_date                date,
  responsible_id          uuid references public.profiles (id),
  started_at              timestamptz,
  completed_at            timestamptz,
  cancelled_at            timestamptz,
  cancel_reason           text,
  estimated_material_cost numeric(18, 4) not null default 0,
  actual_material_cost    numeric(18, 4) not null default 0,
  external_source         text,
  external_id             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles (id),
  updated_by              uuid references public.profiles (id),
  unique (external_source, external_id)
);

create index work_orders_status_idx on public.work_orders (status);
create index work_orders_customer_idx on public.work_orders (customer_id);
create index work_orders_due_date_idx on public.work_orders (due_date) where status not in ('completed', 'cancelled');
create index work_orders_created_at_idx on public.work_orders (created_at desc);

alter table public.inventory_movements
  add constraint inventory_movements_work_order_id_fkey
  foreign key (work_order_id) references public.work_orders (id);

-- Timeline (append-only)
create table public.work_order_events (
  id            uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id),
  event_type    text not null,
  from_status   public.work_order_status,
  to_status     public.work_order_status,
  payload       jsonb,
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id)
);

create index work_order_events_order_idx on public.work_order_events (work_order_id, created_at);

create trigger work_order_events_immutable
  before update or delete on public.work_order_events
  for each row execute function public.block_mutation();

-- Planned materials
create table public.work_order_materials (
  id                   uuid primary key default gen_random_uuid(),
  work_order_id        uuid not null references public.work_orders (id),
  material_id          uuid not null references public.materials (id),
  planned_quantity     numeric(14, 4) not null check (planned_quantity > 0),
  estimated_unit_cost  numeric(18, 4) not null default 0 check (estimated_unit_cost >= 0),
  estimated_total_cost numeric(18, 4) generated always as (round(planned_quantity * estimated_unit_cost, 4)) stored,
  reserved_quantity    numeric(14, 4) not null default 0 check (reserved_quantity >= 0),
  consumed_quantity    numeric(14, 4) not null default 0 check (consumed_quantity >= 0),
  waste_quantity       numeric(14, 4) not null default 0 check (waste_quantity >= 0),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references public.profiles (id),
  updated_by           uuid references public.profiles (id),
  unique (work_order_id, material_id)
);

create index work_order_materials_material_idx on public.work_order_materials (material_id);

-- Reservations
create table public.material_reservations (
  id                    uuid primary key default gen_random_uuid(),
  work_order_id         uuid not null references public.work_orders (id),
  work_order_material_id uuid not null references public.work_order_materials (id),
  material_id           uuid not null references public.materials (id),
  quantity              numeric(14, 4) not null check (quantity > 0),
  remaining_quantity    numeric(14, 4) not null check (remaining_quantity >= 0 and remaining_quantity <= quantity),
  status                public.reservation_status not null default 'active',
  movement_id           uuid not null references public.inventory_movements (id),
  released_at           timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles (id),
  updated_by            uuid references public.profiles (id)
);

create index material_reservations_order_idx on public.material_reservations (work_order_id);
create index material_reservations_active_idx
  on public.material_reservations (work_order_id, material_id, created_at)
  where status = 'active';

-- Real consumption (useful material)
create table public.material_consumptions (
  id                     uuid primary key default gen_random_uuid(),
  work_order_id          uuid not null references public.work_orders (id),
  work_order_material_id uuid references public.work_order_materials (id), -- null = unplanned
  material_id            uuid not null references public.materials (id),
  quantity               numeric(14, 4) not null check (quantity > 0),
  unit_cost              numeric(18, 4) not null check (unit_cost >= 0),
  total_cost             numeric(18, 4) not null,
  movement_id            uuid not null references public.inventory_movements (id),
  consumed_at            timestamptz not null default now(),
  notes                  text,
  voided_at              timestamptz,
  voided_by              uuid references public.profiles (id),
  void_reason            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references public.profiles (id),
  updated_by             uuid references public.profiles (id),
  check ((voided_at is null) = (void_reason is null))
);

create index material_consumptions_order_idx on public.material_consumptions (work_order_id);
create index material_consumptions_material_idx on public.material_consumptions (material_id, consumed_at);

-- Waste (scrap), recorded independently from consumption
create table public.waste_records (
  id                     uuid primary key default gen_random_uuid(),
  work_order_id          uuid references public.work_orders (id), -- null = warehouse waste
  work_order_material_id uuid references public.work_order_materials (id),
  material_id            uuid not null references public.materials (id),
  quantity               numeric(14, 4) not null check (quantity > 0),
  reason                 public.waste_reason not null,
  unit_cost              numeric(18, 4) not null check (unit_cost >= 0),
  total_cost             numeric(18, 4) not null,
  movement_id            uuid not null references public.inventory_movements (id),
  occurred_at            timestamptz not null default now(),
  notes                  text,
  voided_at              timestamptz,
  voided_by              uuid references public.profiles (id),
  void_reason            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references public.profiles (id),
  updated_by             uuid references public.profiles (id),
  check ((voided_at is null) = (void_reason is null)),
  check (reason <> 'other' or nullif(btrim(coalesce(notes, '')), '') is not null)
);

create index waste_records_order_idx on public.waste_records (work_order_id);
create index waste_records_material_idx on public.waste_records (material_id, occurred_at);

-- -----------------------------------------------------------------------------
-- Work order lifecycle trigger
--   * assigns the OT number
--   * new orders start as draft or pending
--   * completing / cancelling requires the Phase 3 RPCs (they release
--     reservations and freeze costs) which set workflow.work_order_close = 'on'
--   * reopening a completed/cancelled order requires work_orders.reopen
--   * stamps started_at / completed_at / cancelled_at
--   * cost caches only change with workflow.work_order_costs = 'on' (set by
--     refresh_work_order_estimate) or while closing
-- -----------------------------------------------------------------------------
create or replace function public.work_orders_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closing        boolean := coalesce(current_setting('workflow.work_order_close', true), '') = 'on';
  v_updating_costs boolean := coalesce(current_setting('workflow.work_order_costs', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.number := public.next_document_number('work_order');
    if new.status not in ('draft', 'pending') then
      raise exception 'Una orden nueva debe iniciar en Borrador o Pendiente.' using errcode = 'P0001';
    end if;
    new.started_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
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
    if old.status in ('completed', 'cancelled') and not public.has_permission('work_orders.reopen') then
      raise exception 'La orden % está cerrada. Solo un administrador puede reabrirla.', old.number
        using errcode = '42501';
    end if;
    if new.status in ('completed', 'cancelled') and not v_closing then
      raise exception 'Use la acción de cerrar o cancelar la orden para cambiarla a ese estado.'
        using errcode = 'P0001';
    end if;

    if new.status = 'in_production' and old.started_at is null then
      new.started_at := now();
    end if;
    new.completed_at := case when new.status = 'completed' then now() end;
    new.cancelled_at := case when new.status = 'cancelled' then now() end;
  else
    new.started_at := old.started_at;
    new.completed_at := old.completed_at;
    new.cancelled_at := old.cancelled_at;
  end if;

  return new;
end;
$$;

create trigger work_orders_lifecycle
  before insert or update on public.work_orders
  for each row execute function public.work_orders_before_write();

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
    insert into public.work_order_events (work_order_id, event_type, from_status, to_status, created_by)
    values (new.id, 'status_changed', old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger work_orders_timeline
  after insert or update on public.work_orders
  for each row execute function public.work_orders_log_event();

-- Planned materials: snapshot the current average cost, protect the execution
-- caches (reserved/consumed/waste are maintained by stock RPCs only), and keep
-- the order's estimated cost in sync.
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
      if new.estimated_unit_cost is null or new.estimated_unit_cost = 0 then
        select m.avg_cost into new.estimated_unit_cost from public.materials m where m.id = new.material_id;
      end if;
    else
      new.work_order_id := old.work_order_id;
      new.material_id := old.material_id;
      new.reserved_quantity := old.reserved_quantity;
      new.consumed_quantity := old.consumed_quantity;
      new.waste_quantity := old.waste_quantity;
    end if;
  end if;

  return new;
end;
$$;

create trigger work_order_materials_guard
  before insert or update or delete on public.work_order_materials
  for each row execute function public.work_order_materials_before_write();

create or replace function public.refresh_work_order_estimate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := coalesce(new.work_order_id, old.work_order_id);
begin
  perform set_config('workflow.work_order_costs', 'on', true);
  update public.work_orders wo
     set estimated_material_cost = coalesce((
           select sum(wom.estimated_total_cost)
           from public.work_order_materials wom
           where wom.work_order_id = v_order_id
         ), 0)
   where wo.id = v_order_id;
  perform set_config('workflow.work_order_costs', '', true);
  return null;
end;
$$;

create trigger work_order_materials_estimate
  after insert or update or delete on public.work_order_materials
  for each row execute function public.refresh_work_order_estimate();

-- Audit fields, audit log, no deletes
do $$
declare
  t text;
begin
  foreach t in array array['work_orders', 'work_order_materials', 'material_reservations',
                           'material_consumptions', 'waste_records']
  loop
    execute format(
      'create trigger %1$s_audit_fields before insert or update on public.%1$s
         for each row execute function public.set_audit_fields()', t);
  end loop;

  foreach t in array array['work_orders', 'material_reservations', 'material_consumptions', 'waste_records']
  loop
    execute format(
      'create trigger %1$s_no_delete before delete on public.%1$s
         for each row execute function public.prevent_delete()', t);
  end loop;
end;
$$;

create trigger work_orders_audit
  after insert or update on public.work_orders
  for each row execute function public.audit_row_change('estimated_material_cost', 'actual_material_cost');

create trigger work_order_materials_audit
  after insert or update or delete on public.work_order_materials
  for each row execute function public.audit_row_change('reserved_quantity', 'consumed_quantity', 'waste_quantity');
