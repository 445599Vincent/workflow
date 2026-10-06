-- =============================================================================
-- Workflow · Database rule tests
--
-- Exercises permissions, RLS, the stock engine and immutability rules.
-- Runs inside a single transaction and ROLLS BACK: safe on a dev database.
-- Expects freshly applied migrations WITHOUT seed data (it asserts document
-- numbers such as MAT-0001 and OT-000001).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/inventory_rules_test.sql
--
-- Any failed expectation raises an exception and aborts the script.
-- Requests are simulated like PostgREST does: SET ROLE authenticated +
-- request.jwt.claim.sub.
-- =============================================================================

begin;

-- Helpers ---------------------------------------------------------------------
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.act_as_system() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

create function pg_temp.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not ilike p_like then
      raise exception 'FAIL: % → unexpected error "%" (expected like "%")', p_sql, sqlerrm, p_like;
    end if;
    raise notice 'PASS (error) %', left(p_sql, 70);
    return;
  end;
  raise exception 'FAIL: expected an error for: %', p_sql;
end $$;

create function pg_temp.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FAIL: %', p_label;
  end if;
  raise notice 'PASS %', p_label;
end $$;

grant execute on all functions in schema pg_temp to authenticated, anon;

-- Fixtures ----------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local',      '{"full_name":"Ana Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'almacen@test.local',    '{"full_name":"Carlos Almacén"}'),
  ('00000000-0000-0000-0000-00000000000c', 'produccion@test.local', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'consulta@test.local',   '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'inactivo@test.local',   '{}');

select pg_temp.expect(
  (select count(*) = 5 from public.profiles where email like '%@test.local'),
  'profiles are created for new auth users (default role viewer)');

update public.profiles set role_code = 'admin'      where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role_code = 'warehouse'  where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set role_code = 'production' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set is_active = false        where id = '00000000-0000-0000-0000-00000000000e';

create temp table t_ids (key text primary key, id uuid);
grant all on t_ids to authenticated;

insert into t_ids
select 'cat', id from public.categories where name = 'Viniles'
union all select 'm2', id from public.units where code = 'm2'
union all select 'und', id from public.units where code = 'und';

-- 1. Materials ------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b'); -- warehouse

insert into t_ids
select 'vinil', (public.create_material(
  p_name => 'Vinil blanco brillante',
  p_category_id => (select id from t_ids where key = 'cat'),
  p_base_unit_id => (select id from t_ids where key = 'm2'),
  p_min_stock => 30,
  p_opening_quantity => 100,
  p_opening_unit_cost => 300
)).id;

select pg_temp.expect(
  (select sku = 'MAT-0001' and stock_on_hand = 100 and avg_cost = 300 and created_by = '00000000-0000-0000-0000-00000000000b'
     from public.materials where id = (select id from t_ids where key = 'vinil')),
  'create_material assigns SKU, opening stock and average cost');

select pg_temp.expect(
  (select count(*) = 1 from public.inventory_adjustments
    where material_id = (select id from t_ids where key = 'vinil') and is_opening_balance),
  'opening balance is recorded as an adjustment');

insert into t_ids
select 'tornillo', (public.create_material(
  p_name => 'Tornillo 1/4 x 2',
  p_sku => ' tor-14 ',
  p_category_id => (select id from t_ids where key = 'cat'),
  p_base_unit_id => (select id from t_ids where key = 'und')
)).id;

select pg_temp.expect(
  (select sku = 'TOR-14' and stock_on_hand = 0 from public.materials where id = (select id from t_ids where key = 'tornillo')),
  'manual SKU is normalised and material starts without stock');

select pg_temp.expect_error(
  $$select public.create_material(p_name => 'Duplicado', p_sku => 'TOR-14',
      p_category_id => (select id from t_ids where key = 'cat'), p_base_unit_id => (select id from t_ids where key = 'und'))$$,
  '%Ya existe un material%');

select pg_temp.expect_error(
  $$update public.materials set stock_on_hand = 999 where id = (select id from t_ids where key = 'vinil')$$,
  '%permission denied%');

update public.materials set min_stock = 40, name = 'Vinil blanco brillante 1.52m'
 where id = (select id from t_ids where key = 'vinil');

select pg_temp.expect(
  (select min_stock = 40 and updated_by = '00000000-0000-0000-0000-00000000000b'
     from public.materials where id = (select id from t_ids where key = 'vinil')),
  'material managers can edit descriptive fields');

select pg_temp.expect_error(
  $$delete from public.materials where id = (select id from t_ids where key = 'vinil')$$,
  '%permission denied%');

-- 2. Receipts and average cost --------------------------------------------------
select public.post_inventory_receipt(
  p_lines => jsonb_build_array(
    jsonb_build_object('material_id', (select id from t_ids where key = 'vinil'), 'quantity', 50, 'unit_cost', 360),
    jsonb_build_object('material_id', (select id from t_ids where key = 'tornillo'), 'quantity', 200, 'unit_cost', 4.5)
  ),
  p_invoice_number => 'B0100000123'
);

select pg_temp.expect(
  (select stock_on_hand = 150 and avg_cost = 320 and last_cost = 360
     from public.materials where id = (select id from t_ids where key = 'vinil')),
  'receipt increases stock and recalculates weighted average (100@300 + 50@360 = 150@320)');

select pg_temp.expect(
  (select number = 'ENT-000001' and total_cost = 18900 from public.inventory_receipts),
  'receipt gets a number and total (50*360 + 200*4.5)');

select pg_temp.expect_error(
  $$select public.post_inventory_receipt(p_lines => jsonb_build_array(
      jsonb_build_object('material_id', (select id from t_ids where key = 'tornillo'), 'quantity', 2.5, 'unit_cost', 1)))$$,
  '%decimales%');

select pg_temp.expect_error(
  $$select public.post_inventory_receipt(p_lines => '[]'::jsonb)$$,
  '%al menos una línea%');

-- 3. Adjustments, negative stock and permissions ---------------------------------
select pg_temp.expect_error(
  $$select public.create_inventory_adjustment((select id from t_ids where key = 'vinil'), 'adjustment_out', 5, 'Conteo')$$,
  '%No tiene permiso%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin

select pg_temp.expect_error(
  $$select public.create_inventory_adjustment((select id from t_ids where key = 'vinil'), 'adjustment_out', 200, 'Conteo')$$,
  '%Stock insuficiente%');

select pg_temp.expect_error(
  $$select public.create_inventory_adjustment((select id from t_ids where key = 'vinil'), 'adjustment_out', 5, '  ')$$,
  '%motivo%');

select public.create_inventory_adjustment((select id from t_ids where key = 'vinil'), 'adjustment_out', 10.5, 'Conteo físico');

select pg_temp.expect(
  (select stock_on_hand = 139.5 and avg_cost = 320 from public.materials where id = (select id from t_ids where key = 'vinil')),
  'negative adjustment reduces stock and keeps the average cost');

select public.create_inventory_adjustment((select id from t_ids where key = 'tornillo'), 'adjustment_out', 250, 'Excepción autorizada',
  p_allow_negative => true);

select pg_temp.expect(
  (select stock_on_hand = -50 from public.materials where id = (select id from t_ids where key = 'tornillo'))
  and (select negative_override from public.inventory_movements
        where material_id = (select id from t_ids where key = 'tornillo') order by seq desc limit 1),
  'admin can explicitly authorise negative stock; the movement is flagged');

select pg_temp.expect(
  exists (select 1 from public.audit_logs where action = 'inventory.negative_override'),
  'negative stock override is audited');

-- 4. Ledger integrity -------------------------------------------------------------
select pg_temp.expect(
  (select bool_and(on_hand_after = on_hand_before + on_hand_delta) from public.inventory_movements),
  'every movement stores consistent before/after balances');

select pg_temp.expect(
  (select m.stock_on_hand = (select sum(on_hand_delta) from public.inventory_movements mv where mv.material_id = m.id)
     from public.materials m where m.id = (select id from t_ids where key = 'vinil')),
  'cached stock equals the sum of the ledger');

select pg_temp.expect(
  (select count(*) = 3 from public.material_kardex where material_id = (select id from t_ids where key = 'vinil')),
  'kardex view lists the material movements');

select pg_temp.act_as_system();

select pg_temp.expect_error(
  $$update public.inventory_movements set quantity = 1$$,
  '%inmutables%');

select pg_temp.expect_error(
  $$delete from public.inventory_movements$$,
  '%inmutables%');

select pg_temp.expect_error(
  $$update public.materials set stock_on_hand = 1 where id = (select id from t_ids where key = 'vinil')$$,
  '%solo cambian mediante movimientos%');

select pg_temp.expect_error(
  $$update public.materials set base_unit_id = (select id from t_ids where key = 'und') where id = (select id from t_ids where key = 'vinil')$$,
  '%unidad base%');

select pg_temp.expect_error(
  $$delete from public.materials where id = (select id from t_ids where key = 'vinil')$$,
  '%No se permite eliminar%');

-- 5. Roles, RLS and profiles ------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d'); -- viewer

select pg_temp.expect((select count(*) >= 2 from public.materials_overview), 'viewer can read materials');

select pg_temp.expect_error(
  $$select public.create_material(p_name => 'X', p_category_id => (select id from t_ids where key = 'cat'),
      p_base_unit_id => (select id from t_ids where key = 'und'))$$,
  '%No tiene permiso%');

select pg_temp.expect(
  (select count(*) = 0 from public.audit_logs), 'viewer cannot read the audit log');

select pg_temp.expect_error(
  $$update public.profiles set role_code = 'admin' where id = '00000000-0000-0000-0000-00000000000d'$$,
  '%Solo un administrador%');

update public.profiles set full_name = 'Diana Consulta' where id = '00000000-0000-0000-0000-00000000000d';
select pg_temp.expect(
  (select full_name = 'Diana Consulta' from public.profiles where id = '00000000-0000-0000-0000-00000000000d'),
  'users can update their own name');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e'); -- inactive

select pg_temp.expect((select count(*) = 0 from public.materials), 'inactive users read nothing');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin

select pg_temp.expect_error(
  $$update public.profiles set is_active = false where id = '00000000-0000-0000-0000-00000000000a'$$,
  '%propio%');

select pg_temp.expect((select count(*) > 0 from public.audit_logs), 'admin can read the audit log');

select pg_temp.expect(
  (select array_agg(p order by p) @> array['inventory.allow_negative', 'users.manage'] from public.current_user_permissions() p),
  'current_user_permissions returns the role permissions');

-- 6. Work orders ------------------------------------------------------------------
insert into public.work_orders (title, priority, due_date) values ('Letrero exterior Banco ABC', 'high', current_date - 3);

select pg_temp.expect(
  (select number = 'OT-000001' and status = 'draft' from public.work_orders),
  'work orders get an automatic number and start as draft');

insert into public.work_order_materials (work_order_id, material_id, planned_quantity)
select wo.id, (select id from t_ids where key = 'vinil'), 10 from public.work_orders wo;

select pg_temp.expect(
  (select estimated_material_cost = 3200 from public.work_orders),
  'planned materials snapshot the average cost and update the estimate (10 × 320)');

update public.work_orders set status = 'pending';
update public.work_orders set status = 'in_production';

select pg_temp.expect(
  (select started_at is not null from public.work_orders)
  and (select count(*) = 3 from public.work_order_events),
  'status changes stamp started_at and are written to the timeline');

select pg_temp.expect_error(
  $$update public.work_orders set status = 'completed'$$,
  '%cerrar o cancelar%');

select pg_temp.expect_error(
  $$update public.work_orders set estimated_material_cost = 1$$,
  '%permission denied%');

select pg_temp.expect(
  (select (s ->> 'active_work_orders')::int = 1 and (s ->> 'overdue_work_orders')::int = 1
          and (s ->> 'inventory_value')::numeric = round(139.5 * 320, 2) + round(-50 * 4.5, 2)
     from public.get_dashboard_summary() s),
  'dashboard summary computes KPIs');

-- 7. Anonymous access -------------------------------------------------------------
select pg_temp.act_as_system();
set local role anon;
select pg_temp.expect_error($$select count(*) from public.materials$$, '%permission denied%');
reset role;

rollback;
