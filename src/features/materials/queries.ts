import "server-only";

import { cache } from "react";

import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { MATERIALS_PAGE_SIZE, type MaterialListParams } from "./schemas";

const LIST_COLUMNS =
  "id, sku, name, category_name, unit_symbol, unit_decimals, stock_on_hand, stock_reserved, stock_available, min_stock, avg_cost, inventory_value, stock_status, is_active";

export async function listMaterials(params: MaterialListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * MATERIALS_PAGE_SIZE;

  let query = supabase.from("materials_overview").select(LIST_COLUMNS, { count: "exact" });

  const term = sanitizeSearch(params.q);
  if (term) query = query.or(`sku.ilike.%${term}%,name.ilike.%${term}%`);
  if (params.category) query = query.eq("category_id", params.category);

  switch (params.status) {
    case "active":
      query = query.eq("is_active", true);
      break;
    case "low":
      query = query.in("stock_status", ["low", "out"]);
      break;
    case "out":
      query = query.eq("stock_status", "out");
      break;
    case "inactive":
      query = query.eq("is_active", false);
      break;
    case "all":
      break;
  }

  query = query.order(params.sort, { ascending: params.dir === "asc" });
  if (params.sort !== "name") query = query.order("name", { ascending: true });

  const { data, error, count } = await query.range(from, from + MATERIALS_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron cargar los materiales: ${error.message}`);

  return {
    rows: data,
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / MATERIALS_PAGE_SIZE)),
  };
}

export type MaterialListRow = Awaited<ReturnType<typeof listMaterials>>["rows"][number];

/** Deduplicated per request (used by generateMetadata and the page). */
export const getMaterial = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el material: ${error.message}`);
  return data;
});

export type MaterialDetail = NonNullable<Awaited<ReturnType<typeof getMaterial>>>;

/** Raw row for the edit form (ids, not display names). */
export async function getMaterialForEdit(id: string) {
  const supabase = await createClient();
  const [{ data: material, error }, { count }] = await Promise.all([
    supabase
      .from("materials")
      .select(
        "id, sku, name, description, category_id, base_unit_id, min_stock, max_stock, location_id, primary_supplier_id, tracks_remnants, is_active",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("material_id", id),
  ]);
  if (error) throw new Error(`No se pudo cargar el material: ${error.message}`);
  return material ? { ...material, hasMovements: (count ?? 0) > 0 } : null;
}

export const KARDEX_LIMIT = 50;

export async function getMaterialKardex(materialId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_kardex")
    .select(
      "id, seq, movement_type, quantity, on_hand_delta, reserved_delta, on_hand_after, reserved_after, unit_cost, total_cost, work_order_number, reference, notes, negative_override, occurred_at, created_by_name",
    )
    .eq("material_id", materialId)
    .order("seq", { ascending: false })
    .limit(KARDEX_LIMIT);
  if (error) throw new Error(`No se pudo cargar el kardex: ${error.message}`);
  return data;
}

export type KardexRow = Awaited<ReturnType<typeof getMaterialKardex>>[number];

/** Options for category/unit/location/supplier selects. */
export async function getMaterialFormOptions() {
  const supabase = await createClient();
  const [categories, units, locations, suppliers] = await Promise.all([
    supabase.from("categories").select("id, name, is_active").order("sort_order").order("name"),
    supabase.from("units").select("id, name, symbol, decimals, is_active").order("name"),
    supabase.from("locations").select("id, code, name, is_active").order("name"),
    supabase.from("suppliers").select("id, name, is_active").order("name"),
  ]);

  const failed = [categories, units, locations, suppliers].find((result) => result.error);
  if (failed?.error)
    throw new Error(`No se pudieron cargar los catálogos: ${failed.error.message}`);

  return {
    categories: categories.data ?? [],
    units: units.data ?? [],
    locations: locations.data ?? [],
    suppliers: suppliers.data ?? [],
  };
}

export type MaterialFormOptions = Awaited<ReturnType<typeof getMaterialFormOptions>>;

export async function listCategoryOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  return data;
}
