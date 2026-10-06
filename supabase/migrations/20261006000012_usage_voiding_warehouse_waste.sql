-- =============================================================================
-- Workflow · 012 · Voiding consumption / waste and warehouse waste (Phase 3b)
--
-- CON-05/06, MER-05/07 · ARCHITECTURE D-028, D-029.
--
-- A consumption or waste record is never deleted or edited. Voiding it writes
-- a 'return' movement at the record's frozen unit cost, stamps voided_*, and
-- takes the quantity and cost back out of the order line and the order's
-- actual cost. Warehouse waste (no order) only draws from available stock.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal: give back the stock and cost of one usage record.
-- The caller has already locked the order (if any) and the record.
-- -----------------------------------------------------------------------------
create or replace function public.reverse_material_usage(
  p_kind         public.movement_type, -- 'consumption' or 'waste'
  p_order        public.work_orders,   -- null for warehouse waste
  p_line_id      uuid,
  p_material_id  uuid,
  p_quantity     numeric,
  p_unit_cost    numeric,
  p_total_cost   numeric,
  p_source_table text,
  p_source_id    uuid,
  p_reason       text
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement public.inventory_movements%rowtype;
begin
  v_movement := public.apply_stock_movement(
    p_material_id   => p_material_id,
    p_movement_type => 'return',
    p_quantity      => p_quantity,
    p_unit_cost     => p_unit_cost,
    p_work_order_id => p_order.id,
    p_source_table  => p_source_table,
    p_source_id     => p_source_id,
    p_reference     => 'Anulación ' || coalesce(p_order.number, case when p_kind = 'waste' then 'merma de almacén' else 'consumo' end),
    p_notes         => p_reason
  );

  if p_line_id is not null then
    perform set_config('workflow.inventory_write', 'on', true);
    update public.work_order_materials
       set consumed_quantity = consumed_quantity - case when p_kind = 'consumption' then p_quantity else 0 end,
           waste_quantity    = waste_quantity    - case when p_kind = 'waste' then p_quantity else 0 end,
           actual_cost       = actual_cost - p_total_cost
     where id = p_line_id;
    perform set_config('workflow.inventory_write', '', true);
  end if;

  if p_order.id is not null then
    perform public.refresh_work_order_actual_cost(p_order.id);
    insert into public.work_order_events (work_order_id, event_type, payload, note, created_by)
    values (
      p_order.id,
      case when p_kind = 'waste' then 'waste_voided' else 'consumption_voided' end,
      jsonb_build_object(
        'material_id', p_material_id,
        'material', (select name from public.materials where id = p_material_id),
        'quantity', p_quantity,
        'total_cost', p_total_cost
      ),
      p_reason,
      auth.uid()
    );
  end if;

  return v_movement;
end;
$$;

-- -----------------------------------------------------------------------------
-- CON-05/06: void a consumption of an order in production or installation.
-- -----------------------------------------------------------------------------
create or replace function public.void_consumption(
  p_consumption_id uuid,
  p_reason         text
)
returns public.material_consumptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order    public.work_orders%rowtype;
  v_rec      public.material_consumptions%rowtype;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.require_permission('inventory.void');
  if v_reason is null then
    raise exception 'Indique el motivo de la anulación.' using errcode = 'P0001';
  end if;

  select work_order_id into v_order_id from public.material_consumptions where id = p_consumption_id;
  if not found then
    raise exception 'Consumo no encontrado.' using errcode = 'P0001';
  end if;

  -- Order first, then the record, then the material (D-027).
  v_order := public.lock_work_order(v_order_id, array['in_production', 'in_installation']::public.work_order_status[]);
  select * into v_rec from public.material_consumptions where id = p_consumption_id for update;
  if v_rec.voided_at is not null then
    raise exception 'Este consumo ya fue anulado.' using errcode = 'P0001';
  end if;

  perform public.reverse_material_usage(
    'consumption', v_order, v_rec.work_order_material_id, v_rec.material_id,
    v_rec.quantity, v_rec.unit_cost, v_rec.total_cost, 'material_consumptions', v_rec.id, v_reason
  );

  update public.material_consumptions
     set voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
   where id = v_rec.id
  returning * into v_rec;

  perform public.log_audit_event(
    'work_orders.consumption.voided', 'material_consumptions', v_rec.id::text,
    format('Anuló un consumo de la orden %s: %s', v_order.number, v_reason),
    to_jsonb(v_rec)
  );
  return v_rec;
end;
$$;

-- -----------------------------------------------------------------------------
-- MER-07: void a waste record (of an open order, or warehouse waste).
-- -----------------------------------------------------------------------------
create or replace function public.void_waste(
  p_waste_id uuid,
  p_reason   text
)
returns public.waste_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order    public.work_orders%rowtype;
  v_rec      public.waste_records%rowtype;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.require_permission('inventory.void');
  if v_reason is null then
    raise exception 'Indique el motivo de la anulación.' using errcode = 'P0001';
  end if;

  select work_order_id into v_order_id from public.waste_records where id = p_waste_id;
  if not found then
    raise exception 'Merma no encontrada.' using errcode = 'P0001';
  end if;

  if v_order_id is not null then
    v_order := public.lock_work_order(v_order_id, array['in_production', 'in_installation']::public.work_order_status[]);
  end if;
  select * into v_rec from public.waste_records where id = p_waste_id for update;
  if v_rec.voided_at is not null then
    raise exception 'Esta merma ya fue anulada.' using errcode = 'P0001';
  end if;

  perform public.reverse_material_usage(
    'waste', v_order, v_rec.work_order_material_id, v_rec.material_id,
    v_rec.quantity, v_rec.unit_cost, v_rec.total_cost, 'waste_records', v_rec.id, v_reason
  );

  update public.waste_records
     set voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
   where id = v_rec.id
  returning * into v_rec;

  perform public.log_audit_event(
    'inventory.waste.voided', 'waste_records', v_rec.id::text,
    format('Anuló una merma%s: %s', coalesce(' de la orden ' || v_order.number, ' de almacén'), v_reason),
    to_jsonb(v_rec)
  );
  return v_rec;
end;
$$;

-- -----------------------------------------------------------------------------
-- MER-05 / D-029: waste outside any order (damaged in the warehouse).
-- -----------------------------------------------------------------------------
create or replace function public.register_warehouse_waste(
  p_material_id uuid,
  p_quantity    numeric,
  p_reason      public.waste_reason,
  p_notes       text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       uuid := gen_random_uuid();
  v_notes    text := nullif(btrim(coalesce(p_notes, '')), '');
  v_movement public.inventory_movements%rowtype;
begin
  perform public.require_permission('inventory.adjust');
  if p_reason is null then
    raise exception 'Indique el motivo de la merma.' using errcode = 'P0001';
  end if;
  if p_reason = 'other' and v_notes is null then
    raise exception 'Describa el motivo de la merma.' using errcode = 'P0001';
  end if;

  -- Reserved stock belongs to orders: only the available part can be wasted,
  -- and never below zero (no override, D-029).
  v_movement := public.apply_stock_movement(
    p_material_id       => p_material_id,
    p_movement_type     => 'waste',
    p_quantity          => p_quantity,
    p_reserved_consumed => 0,
    p_source_table      => 'waste_records',
    p_source_id         => v_id,
    p_reference         => 'Merma de almacén',
    p_notes             => v_notes
  );

  insert into public.waste_records (
    id, work_order_id, work_order_material_id, material_id, quantity, reason,
    unit_cost, total_cost, movement_id, notes
  ) values (
    v_id, null, null, p_material_id, p_quantity, p_reason,
    v_movement.unit_cost, v_movement.total_cost, v_movement.id, v_notes
  );

  perform public.log_audit_event(
    'inventory.warehouse_waste', 'waste_records', v_id::text,
    format('Registró merma de almacén de %s', (select name from public.materials where id = p_material_id)),
    to_jsonb(v_movement)
  );
  return v_id;
end;
$$;

comment on function public.void_consumption is
  'Voids a consumption: return movement at its frozen cost, line and order costs reduced (CON-05).';
comment on function public.void_waste is
  'Voids a waste record (order or warehouse): return movement at its frozen cost (MER-07).';
comment on function public.register_warehouse_waste is
  'Waste outside any order; draws only from available stock (MER-05, D-029).';

revoke execute on function public.reverse_material_usage(public.movement_type, public.work_orders, uuid, uuid, numeric, numeric, numeric, text, uuid, text) from public, anon, authenticated;

revoke execute on function public.void_consumption(uuid, text) from public, anon;
revoke execute on function public.void_waste(uuid, text) from public, anon;
revoke execute on function public.register_warehouse_waste(uuid, numeric, public.waste_reason, text) from public, anon;

grant execute on function public.void_consumption(uuid, text) to authenticated;
grant execute on function public.void_waste(uuid, text) to authenticated;
grant execute on function public.register_warehouse_waste(uuid, numeric, public.waste_reason, text) to authenticated;
