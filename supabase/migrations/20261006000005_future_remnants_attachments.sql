-- =============================================================================
-- Workflow · 005 · Prepared tables (Phase 5): remnants and attachments
-- Created now so the data model is settled; no UI or RPC uses them yet.
-- =============================================================================

-- A remnant (retazo) is an identifiable leftover piece. Its quantity is ALREADY
-- part of materials.stock_on_hand: registering a remnant never adds stock
-- (BR RET-02). It answers "which usable pieces do we have?".
create table public.remnants (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  material_id           uuid not null references public.materials (id),
  width                 numeric(10, 4) check (width > 0),
  length                numeric(10, 4) check (length > 0),
  area                  numeric(14, 4) generated always as (round(width * length, 4)) stored,
  quantity              numeric(14, 4) not null check (quantity > 0),
  location_id           uuid references public.locations (id),
  status                public.remnant_status not null default 'available',
  origin_work_order_id  uuid references public.work_orders (id),
  used_in_work_order_id uuid references public.work_orders (id),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles (id),
  updated_by            uuid references public.profiles (id)
);

comment on column public.remnants.quantity is 'Quantity in the material base unit (usually = area for m² materials).';

create index remnants_material_idx on public.remnants (material_id) where status = 'available';

-- Polymorphic attachments stored in Supabase Storage (receipts, orders...).
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id    uuid not null,
  bucket       text not null default 'attachments',
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes >= 0),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id)
);

create index attachments_entity_idx on public.attachments (entity_table, entity_id) where deleted_at is null;

do $$
declare
  t text;
begin
  foreach t in array array['remnants', 'attachments']
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
