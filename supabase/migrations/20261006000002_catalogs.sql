-- =============================================================================
-- Workflow · 002 · Catalogs
-- Categories, units of measure (+ future conversions), storage locations,
-- suppliers and customers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (btrim(name) <> ''),
  description text,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id)
);

create unique index categories_name_key on public.categories (lower(name));

-- -----------------------------------------------------------------------------
-- Units of measure
-- -----------------------------------------------------------------------------
create table public.units (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[a-z0-9_]+$'),
  name       text not null check (btrim(name) <> ''),
  symbol     text not null check (btrim(symbol) <> ''),
  kind       public.unit_kind not null,
  decimals   smallint not null default 2 check (decimals between 0 and 4),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on column public.units.decimals is 'Decimal places allowed for quantities in this unit (0 = whole numbers).';

-- Prepared for future conversions (e.g. 1 roll of vinyl X = 50 m²). Not used in v1.
create table public.unit_conversions (
  id          uuid primary key default gen_random_uuid(),
  from_unit_id uuid not null references public.units (id),
  to_unit_id   uuid not null references public.units (id),
  factor       numeric(18, 8) not null check (factor > 0),
  material_id  uuid, -- FK added in 003 once materials exists; null = generic conversion
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  check (from_unit_id <> to_unit_id)
);

create unique index unit_conversions_key
  on public.unit_conversions (from_unit_id, to_unit_id, coalesce(material_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- -----------------------------------------------------------------------------
-- Storage locations
-- -----------------------------------------------------------------------------
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (btrim(code) <> ''),
  name        text not null check (btrim(name) <> ''),
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id)
);

-- -----------------------------------------------------------------------------
-- Suppliers and customers (external_* map records to ADM Cloud in the future)
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  code            text unique,
  name            text not null check (btrim(name) <> ''),
  tax_id          text,
  contact_name    text,
  phone           text,
  email           text,
  address         text,
  notes           text,
  is_active       boolean not null default true,
  external_source text,
  external_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),
  unique (external_source, external_id)
);

create index suppliers_name_idx on public.suppliers (lower(name));

create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  code            text unique,
  name            text not null check (btrim(name) <> ''),
  tax_id          text,
  contact_name    text,
  phone           text,
  email           text,
  address         text,
  notes           text,
  is_active       boolean not null default true,
  external_source text,
  external_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),
  unique (external_source, external_id)
);

create index customers_name_idx on public.customers (lower(name));

-- -----------------------------------------------------------------------------
-- Triggers: audit fields, audit log, no physical deletes
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'units', 'unit_conversions', 'locations', 'suppliers', 'customers']
  loop
    execute format(
      'create trigger %1$s_audit_fields before insert or update on public.%1$s
         for each row execute function public.set_audit_fields()', t);
    execute format(
      'create trigger %1$s_audit after insert or update on public.%1$s
         for each row execute function public.audit_row_change()', t);
    execute format(
      'create trigger %1$s_no_delete before delete on public.%1$s
         for each row execute function public.prevent_delete()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reference data
-- -----------------------------------------------------------------------------
insert into public.units (code, name, symbol, kind, decimals) values
  ('und',   'Unidad',         'und',  'count',   0),
  ('pza',   'Pieza',          'pza',  'count',   0),
  ('m',     'Metro lineal',   'm',    'length',  2),
  ('pie',   'Pie',            'pie',  'length',  2),
  ('m2',    'Metro cuadrado', 'm²',   'area',    2),
  ('pie2',  'Pie cuadrado',   'pie²', 'area',    2),
  ('kg',    'Kilogramo',      'kg',   'mass',    3),
  ('g',     'Gramo',          'g',    'mass',    1),
  ('l',     'Litro',          'L',    'volume',  3),
  ('ml',    'Mililitro',      'mL',   'volume',  1),
  ('gal',   'Galón',          'gal',  'volume',  3),
  ('rollo', 'Rollo',          'rollo','package', 2),
  ('caja',  'Caja',           'caja', 'package', 0),
  ('lamina','Lámina',         'lám',  'package', 2);

insert into public.categories (name, sort_order) values
  ('Viniles', 1),
  ('Lonas', 2),
  ('Acrílicos', 3),
  ('PVC y espumados', 4),
  ('Metales', 5),
  ('Perfiles', 6),
  ('Electricidad e iluminación', 7),
  ('Pinturas', 8),
  ('Tintas', 9),
  ('Adhesivos', 10),
  ('Tornillería y fijaciones', 11),
  ('Madera', 12),
  ('Accesorios', 13),
  ('Herramientas', 14),
  ('Otros', 99);

insert into public.locations (code, name, description) values
  ('ALM',    'Almacén general',  'Ubicación por defecto'),
  ('RACK-R', 'Rack de rollos',   'Viniles, lonas y papeles en rollo'),
  ('EST-A',  'Estante A',        null),
  ('EST-B',  'Estante B',        null),
  ('PATIO',  'Patio / exterior', 'Perfiles, metales y materiales voluminosos');
