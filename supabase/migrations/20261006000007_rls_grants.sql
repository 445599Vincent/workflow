-- =============================================================================
-- Workflow · 007 · Row Level Security and privileges
--
-- Model:
--   * anon: no access at all.
--   * authenticated: read everything only while the profile is active; writes
--     require a permission (role_permissions). Ledger tables have NO write
--     policies: they are written only by SECURITY DEFINER RPCs.
--   * Column-level grants stop clients from touching balance/cost caches even
--     where an UPDATE policy exists.
--
-- NOTE for future migrations: new tables must enable RLS and grant explicitly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Baseline: revoke broad default privileges
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'roles', 'role_permissions', 'profiles', 'app_settings', 'document_sequences', 'audit_logs',
    'categories', 'units', 'unit_conversions', 'locations', 'suppliers', 'customers',
    'materials', 'inventory_movements', 'inventory_receipts', 'inventory_receipt_lines',
    'inventory_adjustments', 'work_orders', 'work_order_events', 'work_order_materials',
    'material_reservations', 'material_consumptions', 'waste_records', 'remnants', 'attachments'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

grant select on public.materials_overview, public.material_kardex to authenticated;

-- -----------------------------------------------------------------------------
-- Read policies: any active user (audit_logs is restricted below)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'roles', 'role_permissions', 'profiles', 'app_settings', 'document_sequences',
    'categories', 'units', 'unit_conversions', 'locations', 'suppliers', 'customers',
    'materials', 'inventory_movements', 'inventory_receipts', 'inventory_receipt_lines',
    'inventory_adjustments', 'work_orders', 'work_order_events', 'work_order_materials',
    'material_reservations', 'material_consumptions', 'waste_records', 'remnants'
  ]
  loop
    execute format(
      'create policy "Active users can read" on public.%I
         for select to authenticated
         using ((select public.is_active_user()))', t);
  end loop;
end;
$$;

create policy "Active users can read attachments" on public.attachments
  for select to authenticated
  using ((select public.is_active_user()) and deleted_at is null);

create policy "Auditors can read the audit log" on public.audit_logs
  for select to authenticated
  using ((select public.has_permission('audit.view')));

-- -----------------------------------------------------------------------------
-- Profiles: own name/phone, or users.manage (role/is_active guarded by trigger)
-- -----------------------------------------------------------------------------
grant update (full_name, phone, role_code, is_active) on public.profiles to authenticated;

create policy "Users update own profile or manage users" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users.manage')))
  with check (id = (select auth.uid()) or (select public.has_permission('users.manage')));

-- -----------------------------------------------------------------------------
-- Role permissions and settings
-- -----------------------------------------------------------------------------
grant insert, delete on public.role_permissions to authenticated;

create policy "Admins grant permissions" on public.role_permissions
  for insert to authenticated
  with check ((select public.has_permission('users.manage')));

create policy "Admins revoke permissions" on public.role_permissions
  for delete to authenticated
  using ((select public.has_permission('users.manage')));

grant update (value) on public.app_settings to authenticated;

create policy "Admins change settings" on public.app_settings
  for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

-- -----------------------------------------------------------------------------
-- Catalogs
-- -----------------------------------------------------------------------------
grant insert (name, description, sort_order, is_active),
      update (name, description, sort_order, is_active)
  on public.categories to authenticated;

grant insert (code, name, symbol, kind, decimals, is_active),
      update (name, symbol, decimals, is_active)
  on public.units to authenticated;

grant insert (from_unit_id, to_unit_id, factor, material_id, notes, is_active),
      update (factor, notes, is_active)
  on public.unit_conversions to authenticated;

grant insert (code, name, description, is_active),
      update (code, name, description, is_active)
  on public.locations to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'units', 'unit_conversions', 'locations']
  loop
    execute format(
      'create policy "Catalog managers insert" on public.%I
         for insert to authenticated
         with check ((select public.has_permission(''catalog.manage'')))', t);
    execute format(
      'create policy "Catalog managers update" on public.%I
         for update to authenticated
         using ((select public.has_permission(''catalog.manage'')))
         with check ((select public.has_permission(''catalog.manage'')))', t);
  end loop;
end;
$$;

grant insert (code, name, tax_id, contact_name, phone, email, address, notes, is_active),
      update (code, name, tax_id, contact_name, phone, email, address, notes, is_active)
  on public.suppliers to authenticated;

create policy "Supplier managers insert" on public.suppliers
  for insert to authenticated
  with check ((select public.has_permission('suppliers.manage')));

create policy "Supplier managers update" on public.suppliers
  for update to authenticated
  using ((select public.has_permission('suppliers.manage')))
  with check ((select public.has_permission('suppliers.manage')));

grant insert (code, name, tax_id, contact_name, phone, email, address, notes, is_active),
      update (code, name, tax_id, contact_name, phone, email, address, notes, is_active)
  on public.customers to authenticated;

create policy "Customer managers insert" on public.customers
  for insert to authenticated
  with check ((select public.has_permission('customers.manage')));

create policy "Customer managers update" on public.customers
  for update to authenticated
  using ((select public.has_permission('customers.manage')))
  with check ((select public.has_permission('customers.manage')));

-- -----------------------------------------------------------------------------
-- Materials: created through create_material(); descriptive fields editable.
-- Balances and costs have no column grant (and a trigger guards them too).
-- -----------------------------------------------------------------------------
grant update (name, description, category_id, base_unit_id, min_stock, max_stock,
              location_id, primary_supplier_id, tracks_remnants, is_active)
  on public.materials to authenticated;

create policy "Material managers update" on public.materials
  for update to authenticated
  using ((select public.has_permission('materials.manage')))
  with check ((select public.has_permission('materials.manage')));

-- -----------------------------------------------------------------------------
-- Work orders and planned materials (status/cost rules enforced by triggers)
-- -----------------------------------------------------------------------------
grant insert (customer_id, title, description, status, priority, due_date, responsible_id),
      update (customer_id, title, description, status, priority, due_date, responsible_id, cancel_reason)
  on public.work_orders to authenticated;

create policy "Order managers insert" on public.work_orders
  for insert to authenticated
  with check ((select public.has_permission('work_orders.manage')));

create policy "Order managers update" on public.work_orders
  for update to authenticated
  using ((select public.has_permission('work_orders.manage')))
  with check ((select public.has_permission('work_orders.manage')));

grant insert (work_order_id, material_id, planned_quantity, estimated_unit_cost, notes),
      update (planned_quantity, estimated_unit_cost, notes),
      delete
  on public.work_order_materials to authenticated;

create policy "Order managers plan materials" on public.work_order_materials
  for insert to authenticated
  with check ((select public.has_permission('work_orders.manage')));

create policy "Order managers update planned materials" on public.work_order_materials
  for update to authenticated
  using ((select public.has_permission('work_orders.manage')))
  with check ((select public.has_permission('work_orders.manage')));

-- Only lines without reservations/consumption/waste (enforced by trigger).
create policy "Order managers remove planned materials" on public.work_order_materials
  for delete to authenticated
  using ((select public.has_permission('work_orders.manage')));

-- -----------------------------------------------------------------------------
-- Prepared tables
-- -----------------------------------------------------------------------------
grant insert (code, material_id, width, length, quantity, location_id, status, origin_work_order_id, notes),
      update (width, length, quantity, location_id, status, used_in_work_order_id, notes)
  on public.remnants to authenticated;

create policy "Material managers insert remnants" on public.remnants
  for insert to authenticated
  with check ((select public.has_permission('materials.manage')));

create policy "Material managers update remnants" on public.remnants
  for update to authenticated
  using ((select public.has_permission('materials.manage')))
  with check ((select public.has_permission('materials.manage')));

grant insert (entity_table, entity_id, bucket, storage_path, file_name, mime_type, size_bytes),
      update (deleted_at)
  on public.attachments to authenticated;

create policy "Active users upload attachments" on public.attachments
  for insert to authenticated
  with check ((select public.is_active_user()));

create policy "Uploader or auditors soft-delete attachments" on public.attachments
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.has_permission('audit.view')))
  with check (created_by = (select auth.uid()) or (select public.has_permission('audit.view')));

-- -----------------------------------------------------------------------------
-- Function execution: only the public API, never the internal engine
-- -----------------------------------------------------------------------------
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.current_user_permissions() to authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
grant execute on function public.create_material(text, uuid, uuid, text, text, numeric, numeric, uuid, uuid, boolean, numeric, numeric) to authenticated;
grant execute on function public.post_inventory_receipt(jsonb, date, uuid, text, text) to authenticated;
grant execute on function public.create_inventory_adjustment(uuid, public.movement_type, numeric, text, numeric, text, boolean) to authenticated;
