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
  (select sku = 'MAT-0001' and stock_on_hand = 100 and avg_cost = 300 and last_cost = 300 and created_by = '00000000-0000-0000-0000-00000000000b'
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

select pg_temp.expect(
  (select bool_and(material_sku = 'MAT-0001' and unit_symbol = 'm²' and unit_decimals = 2)
     from public.material_kardex where material_id = (select id from t_ids where key = 'vinil')),
  'kardex view carries material code, name and unit');

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


-- 5a. Forced password change (D-023) --------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d'); -- viewer

select pg_temp.expect_error(
  $$update public.profiles set must_change_password = true where id = '00000000-0000-0000-0000-00000000000d'$$,
  '%Solo un administrador puede exigir%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin
update public.profiles set must_change_password = true where id = '00000000-0000-0000-0000-00000000000d';

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d'); -- viewer clears own flag
update public.profiles set must_change_password = false where id = '00000000-0000-0000-0000-00000000000d';

select pg_temp.expect(
  (select not must_change_password from public.profiles where id = '00000000-0000-0000-0000-00000000000d'),
  'admins require a password change; users clear their own flag');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- back to admin

-- 5b. Voiding receipts (BR ENT-05) -------------------------------------------
-- Still acting as admin. Vinil: 139.5 @ 320 before this block.
insert into t_ids
select 'receipt2', (public.post_inventory_receipt(
  p_lines => jsonb_build_array(
    jsonb_build_object('material_id', (select id from t_ids where key = 'vinil'), 'quantity', 10, 'unit_cost', 400)
  )
)).id;

select pg_temp.expect(
  (select stock_on_hand = 149.5 from public.materials where id = (select id from t_ids where key = 'vinil')),
  'second receipt adds stock (139.5 + 10)');

select public.void_inventory_receipt((select id from t_ids where key = 'receipt2'), 'Factura registrada dos veces');

select pg_temp.expect(
  (select stock_on_hand = 139.5 and avg_cost = 320
     from public.materials where id = (select id from t_ids where key = 'vinil'))
  and (select voided_at is not null and void_reason = 'Factura registrada dos veces'
         from public.inventory_receipts where id = (select id from t_ids where key = 'receipt2')),
  'voiding reverses stock and average cost at the original line cost');

select pg_temp.expect(
  exists (select 1 from public.inventory_movements
           where movement_type = 'exit' and reference like 'Anulación ENT-%' and unit_cost = 400),
  'voiding writes a reversing exit movement');

select pg_temp.expect(
  exists (select 1 from public.audit_logs where action = 'inventory.receipt.voided'),
  'voiding is audited');

select pg_temp.expect_error(
  $$select public.void_inventory_receipt((select id from t_ids where key = 'receipt2'), 'Otra vez')$$,
  '%ya fue anulada%');

select pg_temp.expect_error(
  $$select public.void_inventory_receipt((select id from public.inventory_receipts where number = 'ENT-000001'), '  ')$$,
  '%motivo%');

-- Tornillo is at -50 (authorised override): voiding its receipt would push it
-- further down, so the whole void is rejected and nothing changes.
select pg_temp.expect_error(
  $$select public.void_inventory_receipt((select id from public.inventory_receipts where number = 'ENT-000001'), 'Prueba')$$,
  '%Stock insuficiente%');

select pg_temp.expect(
  (select voided_at is null from public.inventory_receipts where number = 'ENT-000001')
  and (select stock_on_hand = 139.5 from public.materials where id = (select id from t_ids where key = 'vinil')),
  'a failed void changes nothing (all-or-nothing)');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b'); -- warehouse

select pg_temp.expect_error(
  $$select public.void_inventory_receipt((select id from public.inventory_receipts where number = 'ENT-000001'), 'Sin permiso')$$,
  '%No tiene permiso%');

select pg_temp.expect_error(
  $$update public.inventory_receipts set voided_at = now(), void_reason = 'directo'$$,
  '%permission denied%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- back to admin

-- 5c. Catalogs ------------------------------------------------------------------
-- Admin (catalog.manage) maintains categories, units and locations.
insert into public.categories (name, sort_order) values ('Señalética', 20);
insert into public.locations (code, name) values ('EST-C', 'Estante C');
update public.units set decimals = 1 where code = 'g';

select pg_temp.expect(
  (select created_by = '00000000-0000-0000-0000-00000000000a' from public.categories where name = 'Señalética'),
  'catalog managers create categories (audit fields filled)');

select pg_temp.expect_error(
  $$insert into public.categories (name) values ('señalética')$$,
  '%duplicate key%');

select pg_temp.expect_error(
  $$update public.units set code = 'gr' where code = 'g'$$,
  '%permission denied%');

select pg_temp.expect_error(
  $$delete from public.categories where name = 'Señalética'$$,
  '%permission denied%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b'); -- warehouse

select pg_temp.expect_error(
  $$insert into public.categories (name) values ('No autorizada')$$,
  '%row-level security%');

update public.locations set name = 'Intento' where code = 'EST-C';
select pg_temp.expect(
  (select name = 'Estante C' from public.locations where code = 'EST-C'),
  'users without catalog.manage cannot change catalogs');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- back to admin

-- 6. Work orders ------------------------------------------------------------------
-- Acting as admin. Vinil: 139.5 m² @ 320, nothing reserved. Tornillo: -50.
insert into public.work_orders (title, priority, due_date) values ('Letrero exterior Banco ABC', 'high', current_date - 3);
insert into t_ids select 'ot1', id from public.work_orders where title = 'Letrero exterior Banco ABC';

select pg_temp.expect(
  (select number = 'OT-000001' and status = 'draft' from public.work_orders),
  'work orders get an automatic number and start as draft');

insert into public.work_order_materials (work_order_id, material_id, planned_quantity)
values ((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 10);
insert into t_ids select 'line_vinil', id from public.work_order_materials;

select pg_temp.expect(
  (select estimated_material_cost = 3200 from public.work_orders),
  'planned materials snapshot the average cost and update the estimate (10 × 320)');

select public.change_work_order_status((select id from t_ids where key = 'ot1'), 'pending');
select public.change_work_order_status((select id from t_ids where key = 'ot1'), 'in_production', 'Arranca impresión');

select pg_temp.expect(
  (select started_at is not null from public.work_orders)
  and (select count(*) = 4 from public.work_order_events)
  and exists (select 1 from public.work_order_events where note = 'Arranca impresión'),
  'status changes stamp started_at and are written to the timeline with their note');

select pg_temp.expect_error(
  $$update public.work_orders set status = 'completed'$$,
  '%permission denied%');

select pg_temp.expect_error(
  $$update public.work_orders set estimated_material_cost = 1$$,
  '%permission denied%');

select pg_temp.expect(
  (select (s ->> 'active_work_orders')::int = 1 and (s ->> 'overdue_work_orders')::int = 1
          and (s ->> 'inventory_value')::numeric = round(139.5 * 320, 2) + round(-50 * 4.5, 2)
     from public.get_dashboard_summary() s),
  'dashboard summary computes KPIs');

-- 6a. Transitions (OT-03) ---------------------------------------------------------
insert into public.work_orders (title) values ('Rotulación camiones');
insert into t_ids select 'ot2', id from public.work_orders where title = 'Rotulación camiones';

select pg_temp.expect_error(
  $$select public.change_work_order_status((select id from t_ids where key = 'ot2'), 'completed')$$,
  '%Solo se puede terminar%');

select public.change_work_order_status((select id from t_ids where key = 'ot2'), 'planned'); -- forward jump

select pg_temp.expect_error(
  $$select public.change_work_order_status((select id from t_ids where key = 'ot2'), 'draft')$$,
  '%retroceder un paso%');

select public.change_work_order_status((select id from t_ids where key = 'ot2'), 'pending'); -- one step back

select pg_temp.expect(
  (select status = 'pending' from public.work_orders where id = (select id from t_ids where key = 'ot2')),
  'orders move forward freely and back one step');

-- 6b. Reservations, consumption and waste -------------------------------------------
select public.reserve_material((select id from t_ids where key = 'line_vinil'), 8);

select pg_temp.expect(
  (select stock_reserved = 8 and stock_available = 131.5 and stock_on_hand = 139.5
     from public.materials where id = (select id from t_ids where key = 'vinil'))
  and (select reserved_quantity = 8 from public.work_order_materials where id = (select id from t_ids where key = 'line_vinil')),
  'reserving moves stock from available to reserved without touching physical stock');

select pg_temp.expect_error(
  $$select public.reserve_material((select id from t_ids where key = 'line_vinil'), 500)$$,
  '%Stock insuficiente%');

select public.consume_material((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 5, 'Impresión de caras');

select pg_temp.expect(
  (select stock_on_hand = 134.5 and stock_reserved = 3
     from public.materials where id = (select id from t_ids where key = 'vinil'))
  and (select consumed_quantity = 5 and reserved_quantity = 3 and actual_cost = 1600
         from public.work_order_materials where id = (select id from t_ids where key = 'line_vinil'))
  and (select actual_material_cost = 1600 from public.work_orders where id = (select id from t_ids where key = 'ot1')),
  'consumption draws the order reservation first and updates the actual cost live');

select public.register_waste((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 1, 'cutting');

select pg_temp.expect(
  (select waste_quantity = 1 and reserved_quantity = 2 and actual_cost = 1920
     from public.work_order_materials where id = (select id from t_ids where key = 'line_vinil'))
  and (select count(*) = 1 from public.waste_records where reason = 'cutting' and total_cost = 320),
  'waste is recorded independently and adds to the actual cost');

select pg_temp.expect_error(
  $$select public.register_waste((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 1, 'other')$$,
  '%Describa el motivo%');

insert into t_ids
select 'perfil', (public.create_material(
  p_name => 'Perfil de aluminio', p_category_id => (select id from t_ids where key = 'cat'),
  p_base_unit_id => (select id from t_ids where key = 'und'),
  p_opening_quantity => 20, p_opening_unit_cost => 100)).id;

select public.consume_material((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'perfil'), 2);

select pg_temp.expect(
  (select not is_planned and planned_quantity = 0 and consumed_quantity = 2 and actual_cost = 200
     from public.work_order_materials where material_id = (select id from t_ids where key = 'perfil'))
  and (select actual_material_cost = 2120 from public.work_orders where id = (select id from t_ids where key = 'ot1')),
  'unplanned consumption adds an unplanned line that counts in the actual cost');

select public.release_reservation((select id from t_ids where key = 'line_vinil'), 1);
select public.release_reservation((select id from t_ids where key = 'line_vinil'));

select pg_temp.expect(
  (select stock_reserved = 0 from public.materials where id = (select id from t_ids where key = 'vinil'))
  and (select bool_and(remaining_quantity = 0 and status <> 'active') from public.material_reservations),
  'releasing (partially, then the rest) returns reserved stock to available');

select pg_temp.expect_error(
  $$select public.release_reservation((select id from t_ids where key = 'line_vinil'))$$,
  '%no tiene reservas activas%');

select public.reserve_material((select id from t_ids where key = 'line_vinil'), 2);

-- Production can consume but cannot reserve or change status.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c'); -- production
select public.consume_material((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 1);
select pg_temp.expect_error(
  $$select public.reserve_material((select id from t_ids where key = 'line_vinil'), 1)$$,
  '%No tiene permiso%');
select pg_temp.expect_error(
  $$select public.change_work_order_status((select id from t_ids where key = 'ot1'), 'in_installation')$$,
  '%No tiene permiso%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d'); -- viewer
select pg_temp.expect_error(
  $$select public.consume_material((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 1)$$,
  '%No tiene permiso%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin

select pg_temp.expect_error(
  $$select public.consume_material((select id from t_ids where key = 'ot2'), (select id from t_ids where key = 'vinil'), 1)$$,
  '%no admite esta operación%');

-- 6c. Closing and cancelling (CIE, OT-07) ------------------------------------------
select public.change_work_order_status((select id from t_ids where key = 'ot1'), 'completed', 'Instalado');

select pg_temp.expect(
  (select status = 'completed' and completed_at is not null and actual_material_cost = 2440
     from public.work_orders where id = (select id from t_ids where key = 'ot1'))
  and (select stock_reserved = 0 from public.materials where id = (select id from t_ids where key = 'vinil')),
  'closing releases leftover reservations and keeps the final actual cost (5+1+1 m² × 320 + 200)');

select pg_temp.expect_error(
  $$select public.consume_material((select id from t_ids where key = 'ot1'), (select id from t_ids where key = 'vinil'), 1)$$,
  '%no admite esta operación%');

select pg_temp.expect_error(
  $$update public.work_order_materials set planned_quantity = 12 where id = (select id from t_ids where key = 'line_vinil')$$,
  '%orden cerrada%');

insert into public.work_order_materials (work_order_id, material_id, planned_quantity)
values ((select id from t_ids where key = 'ot2'), (select id from t_ids where key = 'perfil'), 3);
select public.reserve_material(
  (select id from public.work_order_materials where work_order_id = (select id from t_ids where key = 'ot2')), 3);

select pg_temp.expect_error(
  $$select public.change_work_order_status((select id from t_ids where key = 'ot2'), 'cancelled')$$,
  '%motivo de la cancelación%');

select public.change_work_order_status((select id from t_ids where key = 'ot2'), 'cancelled', 'Cliente desistió');

select pg_temp.expect(
  (select status = 'cancelled' and cancel_reason = 'Cliente desistió'
     from public.work_orders where id = (select id from t_ids where key = 'ot2'))
  and (select stock_reserved = 0 from public.materials where id = (select id from t_ids where key = 'perfil')),
  'cancelling requires a reason and releases the order reservations');

select public.change_work_order_status((select id from t_ids where key = 'ot1'), 'in_production', 'Faltó un tornillo');
select pg_temp.expect(
  (select status = 'in_production' and completed_at is null from public.work_orders where id = (select id from t_ids where key = 'ot1')),
  'administrators can reopen a completed order (back to production)');

-- 6d. Voiding usage and warehouse waste (CON-05/06, MER-05/07) --------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c'); -- production
select pg_temp.expect_error(
  $$select public.void_consumption((select id from public.material_consumptions where notes = 'Impresión de caras'), 'Error')$$,
  '%No tiene permiso%');
select pg_temp.expect_error(
  $$select public.register_warehouse_waste((select id from t_ids where key = 'perfil'), 1, 'damage')$$,
  '%No tiene permiso%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin
select pg_temp.expect_error(
  $$select public.void_consumption((select id from public.material_consumptions where notes = 'Impresión de caras'), '  ')$$,
  '%motivo de la anulación%');

select public.void_consumption(
  (select id from public.material_consumptions where notes = 'Impresión de caras'), 'Se registró en la orden equivocada');

select pg_temp.expect(
  (select stock_on_hand = 137.5 and avg_cost = 320 from public.materials where id = (select id from t_ids where key = 'vinil'))
  and (select consumed_quantity = 1 and actual_cost = 640
         from public.work_order_materials where id = (select id from t_ids where key = 'line_vinil'))
  and (select actual_material_cost = 840 from public.work_orders where id = (select id from t_ids where key = 'ot1'))
  and (select voided_at is not null and void_reason = 'Se registró en la orden equivocada'
         from public.material_consumptions where notes = 'Impresión de caras')
  and (select movement_type = 'return' and quantity = 5 and unit_cost = 320 and total_cost = 1600
         from public.inventory_movements order by seq desc limit 1)
  and exists (select 1 from public.work_order_events where event_type = 'consumption_voided'),
  'voiding a consumption returns the stock at its cost and reduces the line and order cost');

select pg_temp.expect_error(
  $$select public.void_consumption((select id from public.material_consumptions where notes = 'Impresión de caras'), 'Otra vez')$$,
  '%ya fue anulado%');

select public.void_waste((select id from public.waste_records where reason = 'cutting'), 'Pieza aprovechable');
select pg_temp.expect(
  (select waste_quantity = 0 and actual_cost = 320
     from public.work_order_materials where id = (select id from t_ids where key = 'line_vinil'))
  and (select actual_material_cost = 520 from public.work_orders where id = (select id from t_ids where key = 'ot1')),
  'voiding an order waste takes it out of the actual cost');

select pg_temp.expect_error(
  $$select public.register_warehouse_waste((select id from t_ids where key = 'perfil'), 100, 'damage')$$,
  '%Stock insuficiente%');
select pg_temp.expect_error(
  $$select public.register_warehouse_waste((select id from t_ids where key = 'perfil'), 1, 'other')$$,
  '%Describa el motivo%');

insert into t_ids
select 'warehouse_waste', public.register_warehouse_waste((select id from t_ids where key = 'perfil'), 3, 'damage', 'Humedad');
select pg_temp.expect(
  (select stock_on_hand = 15 from public.materials where id = (select id from t_ids where key = 'perfil'))
  and (select work_order_id is null and total_cost = 300 from public.waste_records
        where id = (select id from t_ids where key = 'warehouse_waste')),
  'warehouse waste (no order) takes the material out of available stock');

select public.void_waste((select id from t_ids where key = 'warehouse_waste'), 'Se recuperó');
select pg_temp.expect(
  (select stock_on_hand = 18 from public.materials where id = (select id from t_ids where key = 'perfil')),
  'warehouse waste can be voided');

select public.change_work_order_status((select id from t_ids where key = 'ot1'), 'completed');
select pg_temp.expect_error(
  $$select public.void_consumption(
      (select id from public.material_consumptions where voided_at is null and material_id = (select id from t_ids where key = 'vinil')), 'Tarde')$$,
  '%no admite esta operación%');

-- 6e. Reports, alerts and dashboard ignore voided usage (REP-01, D-030) ----------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d'); -- viewer: reports are read-only for everyone

select pg_temp.expect(
  (select consumed_quantity = 1 and consumed_cost = 320 and waste_quantity = 0 and total_cost = 320
     from public.report_usage_by_material() where sku = 'MAT-0001')
  and (select consumed_quantity = 2 and total_cost = 200 from public.report_usage_by_material() where name = 'Perfil de aluminio'),
  'usage by material counts only records that are not voided');

select pg_temp.expect(
  (select actual_cost = 520 and waste_cost = 0 and variance = actual_cost - estimated_cost
     from public.report_orders_cost() where work_order_id = (select id from t_ids where key = 'ot1')),
  'order cost report lists the completed order with estimated vs actual');

select pg_temp.expect(
  (select sum(total_cost) = 520 from public.report_usage_by_customer()),
  'usage by customer adds up to the orders usage (warehouse waste excluded)');

select pg_temp.expect(
  (select (s ->> 'consumption_cost_month')::numeric = 520 and (s ->> 'waste_cost_month')::numeric = 0
     from public.get_dashboard_summary() s),
  'dashboard month costs exclude voided consumption and waste');

select pg_temp.expect(
  exists (select 1 from public.get_alerts() where kind = 'low_stock' and reference = 'TOR-14' and severity = 'critical'),
  'alerts flag materials without available stock as critical');

select pg_temp.expect(
  (select count(*) = 0 from public.report_usage_by_material(current_date - 40, current_date - 35)),
  'reports respect the period');

select pg_temp.expect(
  (select count(*) = 6 from public.report_monthly_trend())
  and (select consumed_cost = 520 and waste_cost = 0 and completed_orders = 1 and actual_cost = 520
         from public.report_monthly_trend() order by month desc limit 1),
  'monthly trend: six months, current month without voided usage');

-- 6f. Material import (MAT-01…05, D-033) ------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b'); -- warehouse (materials.manage)

select pg_temp.expect(
  public.import_materials(jsonb_build_array(
    jsonb_build_object('line', 2, 'sku', 'imp-lona', 'name', 'Lona frontlit 13 oz',
      'category_id', (select id from t_ids where key = 'cat'), 'base_unit_id', (select id from t_ids where key = 'm2'),
      'min_stock', 20, 'max_stock', 200, 'opening_quantity', 50.5, 'opening_unit_cost', 85),
    jsonb_build_object('line', 3, 'name', 'Remache pop 1/8',
      'category_id', (select id from t_ids where key = 'cat'), 'base_unit_id', (select id from t_ids where key = 'und'),
      'tracks_remnants', false)
  )) = 2,
  'import_materials creates every row and returns the count');

select pg_temp.expect(
  (select stock_on_hand = 50.5 and avg_cost = 85 and last_cost = 85 and min_stock = 20 and max_stock = 200
     from public.materials where sku = 'IMP-LONA')
  and exists (select 1 from public.inventory_adjustments a join public.materials m on m.id = a.material_id
               where m.sku = 'IMP-LONA' and a.is_opening_balance and a.quantity = 50.5)
  and (select sku like 'MAT-%' and stock_on_hand = 0 from public.materials where name = 'Remache pop 1/8'),
  'imported rows get normalised or automatic SKUs and their opening balance');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin: audit.view
select pg_temp.expect(
  (select count(*) = 1 from public.audit_logs where action = 'materials.import' and (new_data ->> 'count')::int = 2),
  'the import is recorded once in the audit log');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b'); -- warehouse

-- All or nothing: the second row fails, so the first is not created either.
select pg_temp.expect_error(
  $$select public.import_materials(jsonb_build_array(
      jsonb_build_object('line', 2, 'name', 'No debe quedar',
        'category_id', (select id from t_ids where key = 'cat'), 'base_unit_id', (select id from t_ids where key = 'und')),
      jsonb_build_object('line', 3, 'sku', 'IMP-LONA', 'name', 'Duplicada',
        'category_id', (select id from t_ids where key = 'cat'), 'base_unit_id', (select id from t_ids where key = 'm2'))))$$,
  'Fila 3: Ya existe un material con el código IMP-LONA%');
select pg_temp.expect(
  not exists (select 1 from public.materials where name = 'No debe quedar'),
  'a failed import creates nothing');

select pg_temp.expect_error(
  $$select public.import_materials(jsonb_build_array(
      jsonb_build_object('line', 7, 'name', 'Tornillo fraccionado',
        'category_id', (select id from t_ids where key = 'cat'), 'base_unit_id', (select id from t_ids where key = 'und'),
        'opening_quantity', 2.5, 'opening_unit_cost', 3)))$$,
  'Fila 7: La cantidad de Tornillo fraccionado admite como máximo 0 decimales%');

select pg_temp.expect_error($$select public.import_materials('[]'::jsonb)$$, '%no tiene materiales%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c'); -- production
select pg_temp.expect_error(
  $$select public.import_materials(jsonb_build_array(jsonb_build_object('name', 'X',
      'category_id', (select id from t_ids where key = 'cat'), 'base_unit_id', (select id from t_ids where key = 'und'))))$$,
  '%No tiene permiso%');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- admin

-- Ledger invariants after all the activity.
select pg_temp.expect(
  (select bool_and(m.stock_on_hand = coalesce(l.on_hand, 0) and m.stock_reserved = coalesce(l.reserved, 0))
     from public.materials m
     left join (select material_id, sum(on_hand_delta) as on_hand, sum(reserved_delta) as reserved
                from public.inventory_movements group by material_id) l on l.material_id = m.id),
  'cached physical and reserved stock always equal the ledger');

select pg_temp.expect(
  (select bool_and(m.stock_reserved = coalesce(w.reserved, 0))
     from public.materials m
     left join (select material_id, sum(reserved_quantity) as reserved
                from public.work_order_materials group by material_id) w on w.material_id = m.id),
  'reserved stock equals what open orders hold');

-- 7. Anonymous access -------------------------------------------------------------
select pg_temp.act_as_system();
set local role anon;
select pg_temp.expect_error($$select count(*) from public.materials$$, '%permission denied%');
select pg_temp.expect_error($$select count(*) from public.get_alerts()$$, '%permission denied%');
reset role;

rollback;
