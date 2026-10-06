import "server-only";

import { createClient } from "@/lib/supabase/server";

function materialCount(rows: { count: number }[]) {
  return rows[0]?.count ?? 0;
}

export async function listCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, sort_order, is_active, materials(count)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  return data.map(({ materials, ...row }) => ({ ...row, materialCount: materialCount(materials) }));
}
export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];

export async function listUnits() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, code, name, symbol, kind, decimals, is_active, materials(count)")
    .order("kind")
    .order("name");
  if (error) throw new Error(`No se pudieron cargar las unidades: ${error.message}`);
  return data.map(({ materials, ...row }) => ({ ...row, materialCount: materialCount(materials) }));
}
export type UnitRow = Awaited<ReturnType<typeof listUnits>>[number];

export async function listLocations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, code, name, description, is_active, materials(count)")
    .order("code");
  if (error) throw new Error(`No se pudieron cargar las ubicaciones: ${error.message}`);
  return data.map(({ materials, ...row }) => ({ ...row, materialCount: materialCount(materials) }));
}
export type LocationRow = Awaited<ReturnType<typeof listLocations>>[number];

/** Counts for the settings hub. */
export async function getCatalogCounts() {
  const supabase = await createClient();
  const count = async (table: "categories" | "units" | "locations") => {
    const { count: total, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (error) throw new Error(`No se pudo contar ${table}: ${error.message}`);
    return total ?? 0;
  };
  const [categories, units, locations] = await Promise.all([
    count("categories"),
    count("units"),
    count("locations"),
  ]);
  return { categories, units, locations };
}

/** Read-only view of app_settings (editing arrives with the settings screen). */
export async function getAppSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("key, value, description");
  if (error) throw new Error(`No se pudo cargar la configuración: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.key, row]));
}
