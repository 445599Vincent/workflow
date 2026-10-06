-- =============================================================================
-- Workflow · 014 · Monthly trend for the dashboard (REP-08)
--
-- Last p_months months (current month included), in the business time zone:
-- consumption and waste cost (voided records excluded, D-030) and the
-- estimated vs actual cost of the orders completed in each month.
-- SECURITY INVOKER: RLS applies.
-- =============================================================================

create or replace function public.report_monthly_trend(p_months integer default 6)
returns table (
  month            date,
  consumed_cost    numeric,
  waste_cost       numeric,
  completed_orders bigint,
  estimated_cost   numeric,
  actual_cost      numeric
)
language sql
stable
set search_path = ''
as $$
  with st as (
    select coalesce(
      (select s.value #>> '{}' from public.app_settings s where s.key = 'timezone'),
      'America/Santo_Domingo'
    ) as tz
  ),
  months as (
    select gs::date as month, st.tz
    from st,
         generate_series(
           date_trunc('month', now() at time zone st.tz)
             - make_interval(months => greatest(1, least(coalesce(p_months, 6), 24)) - 1),
           date_trunc('month', now() at time zone st.tz),
           interval '1 month'
         ) gs
  ),
  usage as (
    select date_trunc('month', r.occurred_at at time zone st.tz)::date as month, r.kind, r.total_cost
    from public.usage_records r, st
  ),
  completed as (
    select date_trunc('month', wo.completed_at at time zone st.tz)::date as month,
           wo.estimated_material_cost, wo.actual_material_cost
    from public.work_orders wo, st
    where wo.status = 'completed'
  )
  select m.month,
         coalesce((select sum(u.total_cost) from usage u where u.month = m.month and u.kind = 'consumption'), 0),
         coalesce((select sum(u.total_cost) from usage u where u.month = m.month and u.kind = 'waste'), 0),
         (select count(*) from completed c where c.month = m.month),
         coalesce((select sum(c.estimated_material_cost) from completed c where c.month = m.month), 0),
         coalesce((select sum(c.actual_material_cost) from completed c where c.month = m.month), 0)
  from months m
  order by m.month;
$$;

comment on function public.report_monthly_trend is
  'Monthly consumption / waste cost and completed orders estimated vs actual (REP-08).';

revoke execute on function public.report_monthly_trend(integer) from public, anon;
grant execute on function public.report_monthly_trend(integer) to authenticated;
