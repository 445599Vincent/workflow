-- =============================================================================
-- Workflow · 015 · Material catalog import (MAT-01…05, D-033)
--
-- import_materials creates a batch of materials, each with its optional opening
-- balance, in ONE transaction: if any row fails nothing is created. Every row
-- goes through create_material, so SKU numbering, opening-balance adjustments,
-- unit precision and permissions are exactly the same as creating by hand.
--
--   p_rows: [{ "line": int (row in the user's file, for messages),
--              "sku": text, "name": text, "description": text,
--              "category_id": uuid, "base_unit_id": uuid,
--              "min_stock": num, "max_stock": num,
--              "location_id": uuid, "primary_supplier_id": uuid,
--              "tracks_remnants": bool,
--              "opening_quantity": num, "opening_unit_cost": num }]
-- =============================================================================

create or replace function public.import_materials(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row      record;
  v_material public.materials%rowtype;
  v_count    integer := 0;
  v_first    text;
  v_last     text;
begin
  perform public.require_permission('materials.manage');

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'El archivo no tiene materiales para importar.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_rows) > 2000 then
    raise exception 'Se pueden importar como máximo 2000 materiales por archivo.' using errcode = 'P0001';
  end if;

  for v_row in
    select coalesce((r.value ->> 'line')::integer, r.ordinality::integer + 1) as line,
           r.value as data
    from jsonb_array_elements(p_rows) with ordinality r
    order by r.ordinality
  loop
    begin
      v_material := public.create_material(
        p_name                => v_row.data ->> 'name',
        p_category_id         => (v_row.data ->> 'category_id')::uuid,
        p_base_unit_id        => (v_row.data ->> 'base_unit_id')::uuid,
        p_sku                 => v_row.data ->> 'sku',
        p_description         => v_row.data ->> 'description',
        p_min_stock           => coalesce((v_row.data ->> 'min_stock')::numeric, 0),
        p_max_stock           => (v_row.data ->> 'max_stock')::numeric,
        p_location_id         => nullif(v_row.data ->> 'location_id', '')::uuid,
        p_primary_supplier_id => nullif(v_row.data ->> 'primary_supplier_id', '')::uuid,
        p_tracks_remnants     => coalesce((v_row.data ->> 'tracks_remnants')::boolean, false),
        p_opening_quantity    => coalesce((v_row.data ->> 'opening_quantity')::numeric, 0),
        p_opening_unit_cost   => coalesce((v_row.data ->> 'opening_unit_cost')::numeric, 0)
      );
    exception
      -- Business messages (already in Spanish) get the file row so the user can
      -- find it; anything else keeps its code and is translated by the app.
      when sqlstate 'P0001' or unique_violation then
        raise exception 'Fila %: %', v_row.line, sqlerrm using errcode = 'P0001';
    end;

    v_count := v_count + 1;
    v_first := coalesce(v_first, v_material.sku);
    v_last  := v_material.sku;
  end loop;

  perform public.log_audit_event(
    'materials.import', 'materials', null,
    format('Importó %s materiales (%s … %s)', v_count, v_first, v_last),
    jsonb_build_object('count', v_count, 'first_sku', v_first, 'last_sku', v_last)
  );

  return v_count;
end;
$$;

comment on function public.import_materials is
  'Creates a batch of materials (with opening balances) atomically through create_material (D-033).';

revoke execute on function public.import_materials(jsonb) from public, anon;
grant execute on function public.import_materials(jsonb) to authenticated;
