-- =============================================================================
-- Workflow · 015 · Material import (IMP-01..06, D-033)
--
-- import_materials validates every row first and only then creates the
-- materials with create_material, all in one transaction: if any row is
-- invalid nothing is imported and the error lists the failing rows.
--
-- p_rows is a JSON array of objects with the keys:
--   sku, name, category, unit, min_stock, max_stock, location, supplier,
--   opening_quantity, opening_unit_cost, description
-- =============================================================================

create or replace function public.import_materials(
  p_rows            jsonb,
  p_create_catalogs boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row        jsonb;
  v_index      integer;
  v_errors     text[] := '{}';
  v_skus       text[] := '{}';
  v_count      integer;
  v_sku        text;
  v_name       text;
  v_category   text;
  v_location   text;
  v_supplier   text;
  v_unit       public.units%rowtype;
  v_min        numeric;
  v_max        numeric;
  v_qty        numeric;
  v_cost       numeric;
  v_code       text;
  v_message    text;
begin
  perform public.require_permission('materials.manage');
  if coalesce(p_create_catalogs, false) then
    perform public.require_permission('catalog.manage');
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'El archivo no tiene filas para importar.' using errcode = 'P0001';
  end if;
  v_count := jsonb_array_length(p_rows);
  if v_count > 2000 then
    raise exception 'Máximo 2,000 filas por archivo (tiene %).', v_count using errcode = 'P0001';
  end if;

  -- ---------------------------------------------------------------------------
  -- 1. Validate everything (IMP-03, IMP-05). Row numbers match the file:
  --    row 1 is the header, so data starts at row 2.
  -- ---------------------------------------------------------------------------
  for v_row, v_index in
    select value, ordinality::integer + 1 from jsonb_array_elements(p_rows) with ordinality
  loop
    v_sku      := nullif(upper(btrim(coalesce(v_row ->> 'sku', ''))), '');
    v_name     := nullif(btrim(coalesce(v_row ->> 'name', '')), '');
    v_category := nullif(btrim(coalesce(v_row ->> 'category', '')), '');
    v_location := nullif(btrim(coalesce(v_row ->> 'location', '')), '');
    v_supplier := nullif(btrim(coalesce(v_row ->> 'supplier', '')), '');

    if v_name is null then
      v_errors := v_errors || format('Fila %s: falta el nombre.', v_index);
    end if;

    if v_sku is not null then
      if v_sku = any (v_skus) then
        v_errors := v_errors || format('Fila %s: el código %s está repetido en el archivo.', v_index, v_sku);
      elsif exists (select 1 from public.materials m where m.sku = v_sku) then
        v_errors := v_errors || format('Fila %s: ya existe un material con el código %s.', v_index, v_sku);
      end if;
      v_skus := v_skus || v_sku;
    end if;

    select * into v_unit from public.units u
     where u.is_active
       and (lower(u.code) = lower(btrim(coalesce(v_row ->> 'unit', '')))
            or u.symbol = btrim(coalesce(v_row ->> 'unit', '')))
     order by (lower(u.code) = lower(btrim(coalesce(v_row ->> 'unit', '')))) desc
     limit 1;
    if not found then
      v_errors := v_errors || format('Fila %s: la unidad "%s" no existe.', v_index, coalesce(v_row ->> 'unit', ''));
    end if;

    if v_category is null then
      v_errors := v_errors || format('Fila %s: falta la categoría.', v_index);
    elsif not coalesce(p_create_catalogs, false)
          and not exists (select 1 from public.categories c where lower(c.name) = lower(v_category)) then
      v_errors := v_errors || format('Fila %s: la categoría "%s" no existe.', v_index, v_category);
    end if;

    if v_location is not null and not coalesce(p_create_catalogs, false)
       and not exists (select 1 from public.locations l
                       where lower(l.name) = lower(v_location) or lower(l.code) = lower(v_location)) then
      v_errors := v_errors || format('Fila %s: la ubicación "%s" no existe.', v_index, v_location);
    end if;

    if v_supplier is not null
       and not exists (select 1 from public.suppliers s
                       where s.is_active and (lower(s.name) = lower(v_supplier) or lower(s.code) = lower(v_supplier))) then
      v_errors := v_errors || format('Fila %s: el proveedor "%s" no existe.', v_index, v_supplier);
    end if;

    begin
      v_min  := coalesce((v_row ->> 'min_stock')::numeric, 0);
      v_max  := (v_row ->> 'max_stock')::numeric;
      v_qty  := coalesce((v_row ->> 'opening_quantity')::numeric, 0);
      v_cost := coalesce((v_row ->> 'opening_unit_cost')::numeric, 0);
    exception when invalid_text_representation then
      v_errors := v_errors || format('Fila %s: hay un número inválido.', v_index);
      continue;
    end;

    if v_min < 0 or v_qty < 0 or v_cost < 0 or (v_max is not null and v_max < 0) then
      v_errors := v_errors || format('Fila %s: las cantidades y el costo no pueden ser negativos.', v_index);
    end if;
    if v_max is not null and v_max < v_min then
      v_errors := v_errors || format('Fila %s: el máximo es menor que el mínimo.', v_index);
    end if;
    if v_unit.id is not null and v_qty <> round(v_qty, v_unit.decimals) then
      v_errors := v_errors || format('Fila %s: la existencia admite como máximo %s decimales (%s).',
                                     v_index, v_unit.decimals, v_unit.name);
    end if;
    if v_qty > 0 and v_cost = 0 then
      v_errors := v_errors || format('Fila %s: indique el costo unitario de la existencia inicial.', v_index);
    end if;
    v_unit := null;
  end loop;

  if cardinality(v_errors) > 0 then
    v_message := array_to_string(v_errors[1:20], E'\n');
    if cardinality(v_errors) > 20 then
      v_message := v_message || format(E'\n… y %s errores más.', cardinality(v_errors) - 20);
    end if;
    raise exception E'No se importó ningún material. Corrija el archivo:\n%', v_message using errcode = 'P0001';
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Missing categories and locations (only when asked, with catalog.manage).
  -- ---------------------------------------------------------------------------
  if coalesce(p_create_catalogs, false) then
    insert into public.categories (name)
    select distinct on (lower(btrim(r ->> 'category'))) btrim(r ->> 'category')
    from jsonb_array_elements(p_rows) r
    where nullif(btrim(coalesce(r ->> 'category', '')), '') is not null
      and not exists (select 1 from public.categories c where lower(c.name) = lower(btrim(r ->> 'category')));

    for v_location in
      select distinct on (lower(btrim(r ->> 'location'))) btrim(r ->> 'location')
      from jsonb_array_elements(p_rows) r
      where nullif(btrim(coalesce(r ->> 'location', '')), '') is not null
        and not exists (select 1 from public.locations l
                        where lower(l.name) = lower(btrim(r ->> 'location'))
                           or lower(l.code) = lower(btrim(r ->> 'location')))
    loop
      v_code := left(nullif(btrim(regexp_replace(upper(v_location), '[^A-Z0-9]+', '-', 'g'), '-'), ''), 20);
      v_code := coalesce(v_code, 'UBI');
      while exists (select 1 from public.locations l where l.code = v_code) loop
        v_code := left(v_code, 16) || '-' || lpad((floor(random() * 1000))::text, 3, '0');
      end loop;
      insert into public.locations (code, name) values (v_code, v_location);
    end loop;
  end if;

  -- ---------------------------------------------------------------------------
  -- 3. Create the materials (same path as the manual form, IMP-04).
  -- ---------------------------------------------------------------------------
  for v_row in select value from jsonb_array_elements(p_rows) loop
    perform public.create_material(
      p_name                => btrim(v_row ->> 'name'),
      p_category_id         => (select c.id from public.categories c
                                where lower(c.name) = lower(btrim(v_row ->> 'category'))),
      p_base_unit_id        => (select u.id from public.units u
                                where u.is_active
                                  and (lower(u.code) = lower(btrim(v_row ->> 'unit'))
                                       or u.symbol = btrim(v_row ->> 'unit'))
                                order by (lower(u.code) = lower(btrim(v_row ->> 'unit'))) desc
                                limit 1),
      p_sku                 => nullif(btrim(coalesce(v_row ->> 'sku', '')), ''),
      p_description         => v_row ->> 'description',
      p_min_stock           => coalesce((v_row ->> 'min_stock')::numeric, 0),
      p_max_stock           => (v_row ->> 'max_stock')::numeric,
      p_location_id         => (select l.id from public.locations l
                                where lower(l.name) = lower(btrim(v_row ->> 'location'))
                                   or lower(l.code) = lower(btrim(v_row ->> 'location'))
                                order by (lower(l.name) = lower(btrim(v_row ->> 'location'))) desc
                                limit 1),
      p_primary_supplier_id => (select s.id from public.suppliers s
                                where s.is_active
                                  and (lower(s.name) = lower(btrim(v_row ->> 'supplier'))
                                       or lower(s.code) = lower(btrim(v_row ->> 'supplier')))
                                limit 1),
      p_opening_quantity    => coalesce((v_row ->> 'opening_quantity')::numeric, 0),
      p_opening_unit_cost   => coalesce((v_row ->> 'opening_unit_cost')::numeric, 0)
    );
  end loop;

  perform public.log_audit_event(
    'materials.imported', 'materials', null,
    format('Importó %s materiales desde un archivo', v_count),
    jsonb_build_object('count', v_count, 'created_catalogs', coalesce(p_create_catalogs, false))
  );

  return v_count;
end;
$$;

comment on function public.import_materials is
  'Bulk material import from CSV rows: validates all rows, then creates them in one transaction (IMP, D-033).';

revoke execute on function public.import_materials(jsonb, boolean) from public, anon;
grant execute on function public.import_materials(jsonb, boolean) to authenticated;
