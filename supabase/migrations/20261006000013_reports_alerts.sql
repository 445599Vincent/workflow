-- =============================================================================
-- Workflow · 013 · Reports and alerts (Phase 4)
--
-- D-030: one definition of usage (consumption + waste, voided records
-- excluded) for reports, alerts and the dashboard. Every function here is
-- SECURITY INVOKER, so RLS keeps applying. Periods are business dates
-- (app_settings.timezone), both ends included.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Usage records: what was really used (REP-01)
-- -----------------------------------------------------------------------------
create or replace view public.usage_records
with (security_invoker = true) as
select 'consumption'::text           as kind,
       c.id,
       c.work_order_id,
       c.material_id,
       c.quantity,
       c.unit_cost,
       c.total_cost,
       c.consumed_at                  as occurred_at,
       null::public.waste_reason      as reason
from public.material_consumptions c
where c.voided_at is null
union all
select 'waste'::text,
       w.id,
       w.work_order_id,
       w.material_id,
       w.quantity,
       w.unit_cost,
       w.total_cost,
       w.occurred_at,
       w.reason
from public.waste_records w
where w.voided_at is null;

comment on view public.usage_records is
  'Consumption and waste that count (not voided). Base of reports, alerts and the dashboard (D-030).';

grant select on public.usage_records to authenticated;

-- -----------------------------------------------------------------------------
-- Business period helper: [start of p_from, start of the day after p_to)
-- Defaults to the current month up to today.
-- -----------------------------------------------------------------------------
create or replace function public.business_period(p_from date default null, p_to date default null)
returns table (period_start timestamptz, period_end timestamptz)
language sql
stable
set search_path = ''
as $$
  with st as (
    select coalesce(
      (select s.value #>> '{}' from public.app_settings s where s.key = 'timezone'),
      'America/Santo_Domingo'
    ) as tz
  )
  select (coalesce(p_from, date_trunc('month', now() at time zone st.tz)::date))::timestamp at time zone st.tz,
         (coalesce(p_to, (now() at time zone st.tz)::date) + 1)::timestamp at time zone st.tz
  from st;
$$;

-- -----------------------------------------------------------------------------
-- REP-03: usage by material
-- -----------------------------------------------------------------------------
create or replace function public.report_usage_by_material(p_from date default null, p_to date default null)
returns table (
  material_id       uuid,
  sku               text,
  name              text,
  category          text,
  unit_symbol       text,
  unit_decimals     smallint,
  consumed_quantity numeric,
  consumed_cost     numeric,
  waste_quantity    numeric,
  waste_cost        numeric,
  total_cost        numeric,
  waste_pct         numeric
)
language sql
stable
set search_path = ''
as $$
  select m.id, m.sku, m.name, c.name, u.symbol, u.decimals,
         coalesce(sum(r.quantity)   filter (where r.kind = 'consumption'), 0),
         coalesce(sum(r.total_cost) filter (where r.kind = 'consumption'), 0),
         coalesce(sum(r.quantity)   filter (where r.kind = 'waste'), 0),
         coalesce(sum(r.total_cost) filter (where r.kind = 'waste'), 0),
         coalesce(sum(r.total_cost), 0),
         round(100 * coalesce(sum(r.quantity) filter (where r.kind = 'waste'), 0) / nullif(sum(r.quantity), 0), 2)
  from public.usage_records r
  cross join public.business_period(p_from, p_to) p
  join public.materials m on m.id = r.material_id
  join public.units u on u.id = m.base_unit_id
  left join public.categories c on c.id = m.category_id
  where r.occurred_at >= p.period_start and r.occurred_at < p.period_end
  group by m.id, m.sku, m.name, c.name, u.symbol, u.decimals
  order by 11 desc, m.name;
$$;

-- -----------------------------------------------------------------------------
-- REP-04: cost of the orders completed in the period (estimated vs actual)
-- -----------------------------------------------------------------------------
create or replace function public.report_orders_cost(p_from date default null, p_to date default null)
returns table (
  work_order_id  uuid,
  number         text,
  title          text,
  customer_name  text,
  completed_at   timestamptz,
  estimated_cost numeric,
  actual_cost    numeric,
  waste_cost     numeric,
  variance       numeric,
  variance_pct   numeric
)
language sql
stable
set search_path = ''
as $$
  select wo.id, wo.number, wo.title, cu.name, wo.completed_at,
         wo.estimated_material_cost,
         wo.actual_material_cost,
         coalesce((select sum(r.total_cost) from public.usage_records r
                   where r.work_order_id = wo.id and r.kind = 'waste'), 0),
         wo.actual_material_cost - wo.estimated_material_cost,
         round(100 * (wo.actual_material_cost - wo.estimated_material_cost)
               / nullif(wo.estimated_material_cost, 0), 2)
  from public.work_orders wo
  cross join public.business_period(p_from, p_to) p
  left join public.customers cu on cu.id = wo.customer_id
  where wo.status = 'completed'
    and wo.completed_at >= p.period_start and wo.completed_at < p.period_end
  order by wo.completed_at desc;
$$;

-- -----------------------------------------------------------------------------
-- REP-05: usage by customer (orders only; warehouse waste has no customer)
-- -----------------------------------------------------------------------------
create or replace function public.report_usage_by_customer(p_from date default null, p_to date default null)
returns table (
  customer_id   uuid,
  customer_name text,
  orders        bigint,
  consumed_cost numeric,
  waste_cost    numeric,
  total_cost    numeric
)
language sql
stable
set search_path = ''
as $$
  select cu.id, coalesce(cu.name, 'Sin cliente'),
         count(distinct r.work_order_id),
         coalesce(sum(r.total_cost) filter (where r.kind = 'consumption'), 0),
         coalesce(sum(r.total_cost) filter (where r.kind = 'waste'), 0),
         coalesce(sum(r.total_cost), 0)
  from public.usage_records r
  cross join public.business_period(p_from, p_to) p
  join public.work_orders wo on wo.id = r.work_order_id
  left join public.customers cu on cu.id = wo.customer_id
  where r.occurred_at >= p.period_start and r.occurred_at < p.period_end
  group by cu.id, cu.name
  order by 6 desc;
$$;

-- -----------------------------------------------------------------------------
-- ALR-01..04: alerts, computed on read
-- -----------------------------------------------------------------------------
create or replace function public.get_alerts()
returns table (
  kind        text,    -- low_stock | over_estimate | overdue | high_waste
  severity    text,    -- critical | warning
  entity_id   uuid,    -- material or work order
  reference   text,    -- SKU or order number
  title       text,
  detail      text,
  metric      numeric
)
language sql
stable
set search_path = ''
as $$
  with st as (
    select
      coalesce((select s.value #>> '{}' from public.app_settings s where s.key = 'timezone'), 'America/Santo_Domingo') as tz,
      coalesce((select (s.value #>> '{}')::numeric from public.app_settings s where s.key = 'consumption_variance_alert_pct'), 10) as variance_pct,
      coalesce((select (s.value #>> '{}')::numeric from public.app_settings s where s.key = 'waste_alert_pct'), 5) as waste_pct
  ),
  watched_orders as (
    -- Orders whose usage still matters: producing, or completed recently.
    select wo.* from public.work_orders wo
    where wo.status in ('in_production', 'in_installation')
       or (wo.status = 'completed' and wo.completed_at >= now() - interval '30 days')
  )
  -- ALR-01
  select 'low_stock',
         case when m.stock_available <= 0 then 'critical' else 'warning' end,
         m.id, m.sku, m.name,
         case when m.stock_available <= 0 then 'Sin existencia disponible'
              else format('Disponible %s %s · mínimo %s %s',
                          trim_scale(m.stock_available), u.symbol, trim_scale(m.min_stock), u.symbol) end,
         m.stock_available
  from public.materials m
  join public.units u on u.id = m.base_unit_id
  where m.is_active and m.stock_available <= m.min_stock

  union all
  -- ALR-02
  select 'over_estimate', 'warning', wo.id, wo.number, wo.title,
         format('Real supera el estimado en %s %%', trim_scale(round(100 * (wo.actual_material_cost - wo.estimated_material_cost) / wo.estimated_material_cost, 1))),
         round(100 * (wo.actual_material_cost - wo.estimated_material_cost) / wo.estimated_material_cost, 2)
  from watched_orders wo, st
  where wo.estimated_material_cost > 0
    and 100 * (wo.actual_material_cost - wo.estimated_material_cost) / wo.estimated_material_cost > st.variance_pct

  union all
  -- ALR-03
  select 'overdue',
         case when (now() at time zone st.tz)::date - wo.due_date > 7 then 'critical' else 'warning' end,
         wo.id, wo.number, wo.title,
         format('Fecha requerida %s · %s días de atraso',
                to_char(wo.due_date, 'DD/MM/YYYY'), (now() at time zone st.tz)::date - wo.due_date),
         ((now() at time zone st.tz)::date - wo.due_date)::numeric
  from public.work_orders wo, st
  where wo.status not in ('completed', 'cancelled')
    and wo.due_date < (now() at time zone st.tz)::date

  union all
  -- ALR-04
  select 'high_waste', 'warning', wo.id, wo.number, wo.title,
         format('Merma de %s: %s %% de lo usado', m.name, trim_scale(round(100 * x.waste / x.used, 1))),
         round(100 * x.waste / x.used, 2)
  from (
    select r.work_order_id, r.material_id,
           sum(r.quantity) filter (where r.kind = 'waste') as waste,
           sum(r.quantity) as used
    from public.usage_records r
    where r.work_order_id is not null
    group by r.work_order_id, r.material_id
  ) x
  join watched_orders wo on wo.id = x.work_order_id
  join public.materials m on m.id = x.material_id
  cross join st
  where x.waste > 0 and 100 * x.waste / x.used > st.waste_pct

  order by 2, 1, 7 desc;
$$;

-- -----------------------------------------------------------------------------
-- Dashboard on the same usage definition (voided records no longer count);
-- overdue follows OT-05 (any status that is not closed).
-- -----------------------------------------------------------------------------
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
  month_usage as (
    select r.kind, r.total_cost
    from public.usage_records r, period
    where r.occurred_at >= period.month_start
  ),
  completed_month as (
    select wo.estimated_material_cost, wo.actual_material_cost
    from public.work_orders wo, period
    where wo.status = 'completed' and wo.completed_at >= period.month_start
  )
  select jsonb_build_object(
    'active_work_orders',   (select count(*) from active_orders),
    'overdue_work_orders',  (select count(*) from public.work_orders wo, period
                              where wo.status not in ('completed', 'cancelled') and wo.due_date < period.today),
    'completed_this_month', (select count(*) from completed_month),
    'inventory_value',      (select coalesce(sum(round(m.stock_on_hand * m.avg_cost, 2)), 0) from public.materials m),
    'active_materials',     (select count(*) from public.materials m where m.is_active),
    'low_stock_materials',  (select count(*) from public.materials m where m.is_active and m.stock_available <= m.min_stock),
    'consumption_cost_month', (select coalesce(sum(total_cost), 0) from month_usage where kind = 'consumption'),
    'waste_cost_month',     (select coalesce(sum(total_cost), 0) from month_usage where kind = 'waste'),
    'estimated_cost_completed_month', (select coalesce(sum(estimated_material_cost), 0) from completed_month),
    'actual_cost_completed_month',    (select coalesce(sum(actual_material_cost), 0) from completed_month),
    'month_start',          (select month_start from period)
  );
$$;

create or replace function public.get_top_consumed_materials(
  p_from  timestamptz default null,
  p_limit integer default 5
)
returns table (
  material_id   uuid,
  sku           text,
  name          text,
  unit_symbol   text,
  unit_decimals smallint,
  quantity      numeric,
  total_cost    numeric
)
language sql
stable
set search_path = ''
as $$
  with settings as (
    select coalesce(
      (select s.value #>> '{}' from public.app_settings s where s.key = 'timezone'),
      'America/Santo_Domingo'
    ) as tz
  )
  select m.id, m.sku, m.name, u.symbol, u.decimals,
         sum(r.quantity)                as quantity,
         coalesce(sum(r.total_cost), 0) as total_cost
  from public.usage_records r
  join public.materials m on m.id = r.material_id
  join public.units u on u.id = m.base_unit_id
  cross join settings st
  where r.occurred_at >= coalesce(p_from, date_trunc('month', now() at time zone st.tz) at time zone st.tz)
  group by m.id, m.sku, m.name, u.symbol, u.decimals
  order by total_cost desc, quantity desc
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function public.business_period(date, date) from public, anon;
revoke execute on function public.report_usage_by_material(date, date) from public, anon;
revoke execute on function public.report_orders_cost(date, date) from public, anon;
revoke execute on function public.report_usage_by_customer(date, date) from public, anon;
revoke execute on function public.get_alerts() from public, anon;

grant execute on function public.business_period(date, date) to authenticated;
grant execute on function public.report_usage_by_material(date, date) to authenticated;
grant execute on function public.report_orders_cost(date, date) to authenticated;
grant execute on function public.report_usage_by_customer(date, date) to authenticated;
grant execute on function public.get_alerts() to authenticated;
