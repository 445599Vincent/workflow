-- =============================================================================
-- Workflow · Demo data for LOCAL development only (`supabase db reset`).
-- Never run against production.
--
-- Demo login:  admin@workflow.local / workflow-demo
-- =============================================================================

-- Demo administrator (Supabase local auth schema)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'admin@workflow.local',
  extensions.crypt('workflow-demo', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrador Demo"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '{"sub":"a0000000-0000-4000-8000-000000000001","email":"admin@workflow.local"}',
  'email', now(), now(), now()
);

update public.profiles set role_code = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';

-- Act as the demo admin so RPC permission checks and created_by work.
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);

insert into public.suppliers (code, name, tax_id, contact_name, phone) values
  ('PRV-001', 'Distribuidora Gráfica del Caribe', '130000001', 'María Pérez', '809-555-0101'),
  ('PRV-002', 'Acrílicos y Plásticos RD',         '130000002', 'José Gómez',  '809-555-0102'),
  ('PRV-003', 'Ferretería Industrial Santo Domingo', '130000003', null,        '809-555-0103'),
  ('PRV-004', 'Iluminación LED Total',            '130000004', 'Laura Díaz',  '829-555-0104');

insert into public.customers (code, name, contact_name) values
  ('CLI-001', 'Banco ABC',            'Departamento de Mercadeo'),
  ('CLI-002', 'Supermercados La Plaza', 'Gerencia de Tiendas'),
  ('CLI-003', 'Clínica Santa Fe',      null);

-- Materials with opening balances
with m (name, category, unit, min_stock, location, supplier, qty, cost) as (
  values
    ('Vinil blanco brillante 1.52 m',   'Viniles',                    'm2',  30,  'RACK-R', 'PRV-001', 125.5, 325),
    ('Vinil negro mate 1.52 m',         'Viniles',                    'm2',  20,  'RACK-R', 'PRV-001', 18,    330),
    ('Vinil microperforado',            'Viniles',                    'm2',  15,  'RACK-R', 'PRV-001', 42,    410),
    ('Lona front 13 oz',                'Lonas',                      'm2',  50,  'RACK-R', 'PRV-001', 210,   145),
    ('Lona backlight',                  'Lonas',                      'm2',  25,  'RACK-R', 'PRV-001', 0,     0),
    ('Acrílico blanco opal 3 mm',       'Acrílicos',                  'm2',  6,   'EST-A',  'PRV-002', 14.6,  1850),
    ('Acrílico transparente 5 mm',      'Acrílicos',                  'm2',  4,   'EST-A',  'PRV-002', 3.2,   2600),
    ('PVC espumado 5 mm',               'PVC y espumados',            'm2',  10,  'EST-A',  'PRV-002', 36,    780),
    ('Perfil de aluminio para letrero', 'Perfiles',                   'm',   40,  'PATIO',  'PRV-003', 96,    210),
    ('Tubo de hierro 1x1',              'Metales',                    'm',   30,  'PATIO',  'PRV-003', 54,    95),
    ('Tornillo autorroscante 1/4 x 2',  'Tornillería y fijaciones',   'und', 200, 'EST-B',  'PRV-003', 1450,  4.5),
    ('Cable eléctrico #14',             'Electricidad e iluminación', 'm',   50,  'EST-B',  'PRV-004', 180,   38),
    ('Módulo LED blanco 3 leds',        'Electricidad e iluminación', 'und', 100, 'EST-B',  'PRV-004', 320,   28),
    ('Fuente de poder 12V 30A',         'Electricidad e iluminación', 'und', 5,   'EST-B',  'PRV-004', 3,     2350),
    ('Tinta solvente cian',             'Tintas',                     'l',   2,   'EST-B',  'PRV-001', 6.5,   3200),
    ('Pintura esmalte blanco',          'Pinturas',                   'gal', 3,   'EST-B',  'PRV-003', 7,     1450),
    ('Adhesivo de contacto',            'Adhesivos',                  'gal', 2,   'EST-B',  'PRV-003', 1,     1900)
)
select public.create_material(
  p_name                => m.name,
  p_category_id         => (select id from public.categories where name = m.category),
  p_base_unit_id        => (select id from public.units where code = m.unit),
  p_min_stock           => m.min_stock,
  p_location_id         => (select id from public.locations where code = m.location),
  p_primary_supplier_id => (select id from public.suppliers where code = m.supplier),
  p_tracks_remnants     => m.unit = 'm2',
  p_opening_quantity    => m.qty,
  p_opening_unit_cost   => m.cost
)
from m;

-- A purchase receipt
select public.post_inventory_receipt(
  p_lines => jsonb_build_array(
    jsonb_build_object('material_id', (select id from public.materials where name = 'Vinil blanco brillante 1.52 m'), 'quantity', 50, 'unit_cost', 340),
    jsonb_build_object('material_id', (select id from public.materials where name = 'Módulo LED blanco 3 leds'), 'quantity', 200, 'unit_cost', 26.5)
  ),
  p_supplier_id    => (select id from public.suppliers where code = 'PRV-001'),
  p_invoice_number => 'B0100004512',
  p_notes          => 'Compra semanal'
);

-- Work orders with planned materials (execution RPCs arrive in Phase 3)
insert into public.work_orders (customer_id, title, description, status, priority, due_date, responsible_id) values
  ((select id from public.customers where code = 'CLI-001'),
   'Fabricación e instalación de letrero exterior',
   'Letrero en caja de luz con acrílico opal y vinil impreso, 3.0 x 1.4 m.',
   'pending', 'high', current_date + 5, 'a0000000-0000-4000-8000-000000000001'),
  ((select id from public.customers where code = 'CLI-002'),
   'Valla publicitaria temporada escolar',
   'Lona front 10 x 4 m con estructura existente.',
   'pending', 'normal', current_date - 2, 'a0000000-0000-4000-8000-000000000001'),
  ((select id from public.customers where code = 'CLI-003'),
   'Rotulación de vehículos (2 unidades)',
   null, 'draft', 'low', current_date + 15, null);

insert into public.work_order_materials (work_order_id, material_id, planned_quantity)
select wo.id, mat.id, x.qty
from (values
  ('Fabricación e instalación de letrero exterior', 'Vinil blanco brillante 1.52 m', 10),
  ('Fabricación e instalación de letrero exterior', 'Acrílico blanco opal 3 mm',     4.2),
  ('Fabricación e instalación de letrero exterior', 'Perfil de aluminio para letrero', 12),
  ('Fabricación e instalación de letrero exterior', 'Tornillo autorroscante 1/4 x 2', 20),
  ('Fabricación e instalación de letrero exterior', 'Cable eléctrico #14',           3),
  ('Fabricación e instalación de letrero exterior', 'Fuente de poder 12V 30A',       1),
  ('Valla publicitaria temporada escolar',          'Lona front 13 oz',              42)
) as x (title, material, qty)
join public.work_orders wo on wo.title = x.title
join public.materials mat on mat.name = x.material;

update public.work_orders set status = 'planned' where title = 'Fabricación e instalación de letrero exterior';
update public.work_orders set status = 'in_production' where title = 'Valla publicitaria temporada escolar';

select set_config('request.jwt.claim.sub', '', false);
