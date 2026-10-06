-- =============================================================================
-- Workflow · 006 · Read models
-- Views run with security_invoker so the caller's RLS applies.
-- =============================================================================

-- Inventory table / materials list.
create view public.materials_overview
with (security_invoker = true)
as
select
  m.id,
  m.sku,
  m.name,
  m.description,
  m.category_id,
  c.name                                  as category_name,
  m.base_unit_id,
  u.code                                  as unit_code,
  u.name                                  as unit_name,
  u.symbol                                as unit_symbol,
  u.decimals                              as unit_decimals,
  m.stock_on_hand,
  m.stock_reserved,
  m.stock_available,
  m.min_stock,
  m.max_stock,
  m.avg_cost,
  m.last_cost,
  round(m.stock_on_hand * m.avg_cost, 2)  as inventory_value,
  case
    when not m.is_active then 'inactive'
    when m.stock_available <= 0 then 'out'
    when m.stock_available <= m.min_stock then 'low'
    else 'ok'
  end                                     as stock_status,
  m.location_id,
  l.name                                  as location_name,
  m.primary_supplier_id,
  s.name                                  as supplier_name,
  m.tracks_remnants,
  m.is_active,
  m.created_at,
  m.updated_at
from public.materials m
join public.categories c on c.id = m.category_id
join public.units u on u.id = m.base_unit_id
left join public.locations l on l.id = m.location_id
left join public.suppliers s on s.id = m.primary_supplier_id;

comment on view public.materials_overview is
  'Materials with catalog names, available stock, inventory value and stock status (out/low/ok/inactive).';

-- Kardex: ledger rows with readable references.
create view public.material_kardex
with (security_invoker = true)
as
select
  mv.id,
  mv.seq,
  mv.material_id,
  mv.movement_type,
  mv.quantity,
  mv.on_hand_delta,
  mv.reserved_delta,
  mv.on_hand_before,
  mv.on_hand_after,
  mv.reserved_before,
  mv.reserved_after,
  mv.unit_cost,
  mv.total_cost,
  mv.avg_cost_after,
  mv.work_order_id,
  wo.number      as work_order_number,
  mv.source_table,
  mv.source_id,
  mv.reference,
  mv.notes,
  mv.negative_override,
  mv.occurred_at,
  mv.created_by,
  p.full_name    as created_by_name
from public.inventory_movements mv
left join public.work_orders wo on wo.id = mv.work_order_id
left join public.profiles p on p.id = mv.created_by;

-- Dashboard KPIs in a single round trip (security invoker: respects RLS).
create or replace function public.get_dashboard_summary()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with settings as (
    select coalesce(
      (select s.value #>> '{}' from public.app_settings s where s.key = 'timezone'),
      'America/Santo_Domingo'
    ) as tz
  ),
  period as (
    select
      (date_trunc('month', now() at time zone st.tz) at time zone st.tz) as month_start,
      (now() at time zone st.tz)::date                                     as today
    from settings st
  ),
  active_orders as (
    select wo.*
    from public.work_orders wo
    where wo.status in ('pending', 'planned', 'in_production', 'in_installation')
  ),
  month_movements as (
    select mv.movement_type, mv.total_cost
    from public.inventory_movements mv, period
    where mv.occurred_at >= period.month_start
  ),
  completed_month as (
    select wo.estimated_material_cost, wo.actual_material_cost
    from public.work_orders wo, period
    where wo.status = 'completed' and wo.completed_at >= period.month_start
  )
  select jsonb_build_object(
    'active_work_orders',   (select count(*) from active_orders),
    'overdue_work_orders',  (select count(*) from active_orders ao, period where ao.due_date < period.today),
    'completed_this_month', (select count(*) from completed_month),
    'inventory_value',      (select coalesce(sum(round(m.stock_on_hand * m.avg_cost, 2)), 0) from public.materials m),
    'active_materials',     (select count(*) from public.materials m where m.is_active),
    'low_stock_materials',  (select count(*) from public.materials m where m.is_active and m.stock_available <= m.min_stock),
    'consumption_cost_month', (select coalesce(sum(total_cost), 0) from month_movements where movement_type = 'consumption'),
    'waste_cost_month',     (select coalesce(sum(total_cost), 0) from month_movements where movement_type = 'waste'),
    'estimated_cost_completed_month', (select coalesce(sum(estimated_material_cost), 0) from completed_month),
    'actual_cost_completed_month',    (select coalesce(sum(actual_material_cost), 0) from completed_month),
    'month_start',          (select month_start from period)
  );
$$;
