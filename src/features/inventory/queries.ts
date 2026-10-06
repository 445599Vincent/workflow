import "server-only";

import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import {
  MOVEMENTS_PAGE_SIZE,
  WASTE_PAGE_SIZE,
  type MovementListParams,
  type WasteListParams,
} from "./schemas";

/** Dominican Republic is UTC-4 all year (no daylight saving time). */
const DR_OFFSET = "-04:00";

export async function listMovements(params: MovementListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * MOVEMENTS_PAGE_SIZE;

  let query = supabase
    .from("material_kardex")
    .select(
      "id, seq, material_id, material_sku, material_name, unit_symbol, unit_decimals, movement_type, quantity, on_hand_delta, reserved_delta, on_hand_after, total_cost, work_order_number, reference, notes, negative_override, occurred_at, created_by_name",
      { count: "exact" },
    );

  const term = sanitizeSearch(params.q);
  if (term) {
    query = query.or(
      `material_sku.ilike.%${term}%,material_name.ilike.%${term}%,reference.ilike.%${term}%,work_order_number.ilike.%${term}%`,
    );
  }
  if (params.type) query = query.eq("movement_type", params.type);
  if (params.from) query = query.gte("occurred_at", `${params.from}T00:00:00${DR_OFFSET}`);
  if (params.to) query = query.lte("occurred_at", `${params.to}T23:59:59.999${DR_OFFSET}`);

  const { data, error, count } = await query
    .order("seq", { ascending: false })
    .range(from, from + MOVEMENTS_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron cargar los movimientos: ${error.message}`);

  return {
    rows: data,
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / MOVEMENTS_PAGE_SIZE)),
  };
}

export type MovementRow = Awaited<ReturnType<typeof listMovements>>["rows"][number];

/** Waste records (orders and warehouse), newest first, plus the active total. */
export async function listWaste(params: WasteListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * WASTE_PAGE_SIZE;

  let query = supabase.from("waste_records").select(
    `id, quantity, total_cost, reason, notes, occurred_at, voided_at, void_reason, work_order_id,
       material:materials(id, sku, name, unit:units(symbol, decimals)),
       work_order:work_orders(id, number, title),
       author:profiles!waste_records_created_by_fkey(full_name),
       voider:profiles!waste_records_voided_by_fkey(full_name)`,
    { count: "exact" },
  );
  // Same filters for the total of active (not voided) waste.
  let totals = supabase.from("waste_records").select("total_cost").is("voided_at", null);

  if (params.scope === "orders") {
    query = query.not("work_order_id", "is", null);
    totals = totals.not("work_order_id", "is", null);
  } else if (params.scope === "warehouse") {
    query = query.is("work_order_id", null);
    totals = totals.is("work_order_id", null);
  }
  if (params.from) {
    query = query.gte("occurred_at", `${params.from}T00:00:00${DR_OFFSET}`);
    totals = totals.gte("occurred_at", `${params.from}T00:00:00${DR_OFFSET}`);
  }
  if (params.to) {
    query = query.lte("occurred_at", `${params.to}T23:59:59.999${DR_OFFSET}`);
    totals = totals.lte("occurred_at", `${params.to}T23:59:59.999${DR_OFFSET}`);
  }

  const [list, sum] = await Promise.all([
    query.order("occurred_at", { ascending: false }).range(from, from + WASTE_PAGE_SIZE - 1),
    totals,
  ]);
  if (list.error) throw new Error(`No se pudieron cargar las mermas: ${list.error.message}`);
  if (sum.error) throw new Error(`No se pudo calcular el total de merma: ${sum.error.message}`);

  return {
    rows: list.data,
    total: list.count ?? 0,
    activeCost: sum.data.reduce((acc, row) => acc + row.total_cost, 0),
    activeCount: sum.data.length,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((list.count ?? 0) / WASTE_PAGE_SIZE)),
  };
}
export type WasteRow = Awaited<ReturnType<typeof listWaste>>["rows"][number];

/** REP-06: inventory value by category (active materials) and stock health. */
export async function getInventoryValuation() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials_overview")
    .select("category_id, category_name, inventory_value, stock_status")
    .eq("is_active", true);
  if (error) throw new Error(`No se pudo calcular el inventario: ${error.message}`);

  const byCategory = new Map<
    string,
    { id: string | null; name: string; materials: number; value: number }
  >();
  let total = 0;
  let low = 0;
  let out = 0;
  for (const row of data) {
    const key = row.category_id ?? "none";
    const entry = byCategory.get(key) ?? {
      id: row.category_id,
      name: row.category_name ?? "Sin categoría",
      materials: 0,
      value: 0,
    };
    entry.materials += 1;
    entry.value += row.inventory_value ?? 0;
    byCategory.set(key, entry);
    total += row.inventory_value ?? 0;
    if (row.stock_status === "low") low += 1;
    if (row.stock_status === "out") out += 1;
  }

  return {
    total,
    materials: data.length,
    low,
    out,
    categories: [...byCategory.values()].sort((a, b) => b.value - a.value),
  };
}
