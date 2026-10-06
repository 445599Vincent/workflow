-- =============================================================================
-- Workflow · 001 · Foundation
-- Enums, shared trigger helpers, roles & permissions, profiles, settings,
-- document numbering and audit log.
-- See docs/DATABASE.md and docs/BUSINESS_RULES.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------
create type public.unit_kind as enum ('count', 'length', 'area', 'volume', 'mass', 'package');

create type public.movement_type as enum (
  'entry',
  'exit',
  'reservation',
  'reservation_release',
  'consumption',
  'waste',
  'return',
  'adjustment_in',
  'adjustment_out'
);

create type public.work_order_status as enum (
  'draft',
  'pending',
  'planned',
  'in_production',
  'in_installation',
  'completed',
  'cancelled'
);

create type public.work_order_priority as enum ('low', 'normal', 'high', 'urgent');

create type public.waste_reason as enum (
  'print_error',
  'cutting',
  'damage',
  'test',
  'installation',
  'defect',
  'other'
);

create type public.reservation_status as enum ('active', 'released', 'consumed');

create type public.remnant_status as enum ('available', 'reserved', 'used', 'discarded');

-- -----------------------------------------------------------------------------
-- Roles, profiles and permissions
-- -----------------------------------------------------------------------------
create table public.roles (
  code        text primary key check (code ~ '^[a-z_]+$'),
  name        text not null,
  description text,
  sort_order  smallint not null default 0
);

comment on table public.roles is 'Application roles. Permissions per role live in role_permissions.';

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role_code  text not null default 'viewer' references public.roles (code),
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.profiles is 'One row per auth user. Users are deactivated, never deleted.';

create index profiles_role_code_idx on public.profiles (role_code);

create table public.role_permissions (
  role_code  text not null references public.roles (code) on delete cascade,
  permission text not null check (permission ~ '^[a-z_]+\.[a-z_]+$'),
  created_at timestamptz not null default now(),
  primary key (role_code, permission)
);

comment on table public.role_permissions is 'Permission codes (module.action) granted to each role.';

-- -----------------------------------------------------------------------------
-- Shared trigger helpers
-- -----------------------------------------------------------------------------

-- Fills created_at/created_by/updated_at/updated_by. created_* are immutable.
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_at := new.created_at;
    new.updated_by := new.created_by;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

-- Ledger / log tables are append-only.
create or replace function public.block_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Los registros de % son inmutables. Registre una corrección en lugar de modificarlos.',
    tg_table_name
    using errcode = 'P0001';
end;
$$;

-- Critical master data is deactivated or voided, never deleted.
create or replace function public.prevent_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'No se permite eliminar registros de %. Desactive o anule el registro.',
    tg_table_name
    using errcode = 'P0001';
end;
$$;

-- -----------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies and RPC functions)
-- -----------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_code = p.role_code
    where p.id = auth.uid()
      and p.is_active
      and rp.permission = p_permission
  );
$$;

create or replace function public.current_user_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select rp.permission
  from public.profiles p
  join public.role_permissions rp on rp.role_code = p.role_code
  where p.id = auth.uid() and p.is_active
  order by rp.permission;
$$;

create or replace function public.require_permission(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission(p_permission) then
    raise exception 'No tiene permiso para realizar esta acción (%).', p_permission
      using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles: created automatically for every auth user
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Role and active flag can only be changed by users.manage, and never on
-- your own profile (prevents locking yourself out). Direct SQL sessions
-- without a JWT (dashboard SQL editor, migrations) are allowed.
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role_code is distinct from old.role_code or new.is_active is distinct from old.is_active then
    if not public.has_permission('users.manage') then
      raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario.'
        using errcode = '42501';
    end if;
    if new.id = auth.uid() then
      raise exception 'No puede cambiar su propio rol ni desactivar su propio usuario.'
        using errcode = 'P0001';
    end if;
  end if;

  new.email := old.email; -- email is synchronised from auth.users only
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

create trigger profiles_audit_fields
  before insert or update on public.profiles
  for each row execute function public.set_audit_fields();

-- -----------------------------------------------------------------------------
-- Application settings
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key check (key ~ '^[a-z_]+$'),
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id)
);

comment on table public.app_settings is 'Key/value configuration (currency, alert thresholds, time zone).';

-- -----------------------------------------------------------------------------
-- Document numbering (OT-000001, ENT-000001, MAT-0001, AJ-000001)
-- -----------------------------------------------------------------------------
create table public.document_sequences (
  code       text primary key,
  prefix     text not null,
  padding    smallint not null default 6 check (padding between 1 and 12),
  next_value bigint not null default 1 check (next_value > 0),
  updated_at timestamptz not null default now()
);

create or replace function public.next_document_number(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix  text;
  v_padding integer;
  v_value   bigint;
begin
  -- The UPDATE takes a row lock, so concurrent callers get consecutive numbers.
  update public.document_sequences
     set next_value = next_value + 1,
         updated_at = now()
   where code = p_code
  returning prefix, padding, next_value - 1
       into v_prefix, v_padding, v_value;

  if not found then
    raise exception 'Secuencia de documentos no configurada: %', p_code using errcode = 'P0001';
  end if;

  if length(v_value::text) >= v_padding then
    return v_prefix || v_value::text;
  end if;
  return v_prefix || lpad(v_value::text, v_padding, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  actor_id       uuid references public.profiles (id),
  action         text not null,
  entity_table   text not null,
  entity_id      text,
  summary        text,
  old_data       jsonb,
  new_data       jsonb,
  changed_fields text[]
);

comment on table public.audit_logs is 'Append-only audit trail: row changes and business events.';

create index audit_logs_entity_idx on public.audit_logs (entity_table, entity_id, occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.block_mutation();

-- Writes a business event to the audit log.
create or replace function public.log_audit_event(
  p_action       text,
  p_entity_table text,
  p_entity_id    text,
  p_summary      text,
  p_data         jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_table, entity_id, summary, new_data)
  values (auth.uid(), p_action, p_entity_table, p_entity_id, p_summary, p_data);
$$;

-- Generic row-change audit trigger. Trigger arguments list columns to ignore
-- (e.g. balance caches maintained by the inventory engine): an update that only
-- touches ignored columns is not logged.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old     jsonb;
  v_new     jsonb;
  v_row     jsonb;
  v_ignored text[] := array['updated_at', 'updated_by'] || coalesce(tg_argv::text[], array[]::text[]);
  v_changed text[];
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key)
      into v_changed
      from jsonb_each(v_new) n
     where not (n.key = any (v_ignored))
       and n.value is distinct from (v_old -> n.key);

    if v_changed is null then
      return new;
    end if;
  end if;

  v_row := coalesce(v_new, v_old);

  insert into public.audit_logs (actor_id, action, entity_table, entity_id, old_data, new_data, changed_fields)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(
      v_row ->> 'id',
      v_row ->> 'key',
      v_row ->> 'code',
      concat_ws(':', v_row ->> 'role_code', v_row ->> 'permission')
    ),
    v_old,
    v_new,
    v_changed
  );

  return coalesce(new, old);
end;
$$;

create trigger profiles_audit
  after insert or update on public.profiles
  for each row execute function public.audit_row_change();

create trigger role_permissions_audit
  after insert or update or delete on public.role_permissions
  for each row execute function public.audit_row_change();

create trigger app_settings_audit
  after insert or update on public.app_settings
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Reference data
-- -----------------------------------------------------------------------------
insert into public.roles (code, name, description, sort_order) values
  ('admin',      'Administrador', 'Acceso total, usuarios, configuración y excepciones de stock.', 1),
  ('supervisor', 'Supervisor',    'Catálogos, órdenes, ajustes, anulaciones y cierres.',           2),
  ('warehouse',  'Almacén',       'Materiales, proveedores, entradas y reservas.',                 3),
  ('production', 'Producción',    'Registro de consumos y mermas en órdenes.',                     4),
  ('viewer',     'Consulta',      'Solo lectura y reportes.',                                      5);

insert into public.role_permissions (role_code, permission)
select r.role_code, r.permission
from (values
  ('admin', 'catalog.manage'),
  ('admin', 'materials.manage'),
  ('admin', 'suppliers.manage'),
  ('admin', 'customers.manage'),
  ('admin', 'inventory.receive'),
  ('admin', 'inventory.adjust'),
  ('admin', 'inventory.void'),
  ('admin', 'inventory.allow_negative'),
  ('admin', 'work_orders.manage'),
  ('admin', 'work_orders.reserve'),
  ('admin', 'work_orders.consume'),
  ('admin', 'work_orders.close'),
  ('admin', 'work_orders.reopen'),
  ('admin', 'audit.view'),
  ('admin', 'users.manage'),
  ('admin', 'settings.manage'),

  ('supervisor', 'catalog.manage'),
  ('supervisor', 'materials.manage'),
  ('supervisor', 'suppliers.manage'),
  ('supervisor', 'customers.manage'),
  ('supervisor', 'inventory.receive'),
  ('supervisor', 'inventory.adjust'),
  ('supervisor', 'inventory.void'),
  ('supervisor', 'work_orders.manage'),
  ('supervisor', 'work_orders.reserve'),
  ('supervisor', 'work_orders.consume'),
  ('supervisor', 'work_orders.close'),
  ('supervisor', 'audit.view'),

  ('warehouse', 'materials.manage'),
  ('warehouse', 'suppliers.manage'),
  ('warehouse', 'inventory.receive'),
  ('warehouse', 'work_orders.reserve'),
  ('warehouse', 'work_orders.consume'),

  ('production', 'work_orders.consume')
) as r (role_code, permission);

insert into public.app_settings (key, value, description) values
  ('currency',                       '"DOP"',                   'Código ISO de la moneda.'),
  ('currency_symbol',                '"RD$"',                   'Símbolo de moneda mostrado en la interfaz.'),
  ('timezone',                       '"America/Santo_Domingo"', 'Zona horaria para períodos (mes actual, atrasos).'),
  ('consumption_variance_alert_pct', '10',                      'Variación % de consumo real vs estimado que genera alerta.'),
  ('waste_alert_pct',                '5',                       'Merma % sobre el consumo total que se considera considerable.');

insert into public.document_sequences (code, prefix, padding) values
  ('material',             'MAT-', 4),
  ('work_order',           'OT-',  6),
  ('inventory_receipt',    'ENT-', 6),
  ('inventory_adjustment', 'AJ-',  6);
