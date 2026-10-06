import "server-only";

import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { MOVEMENTS_PAGE_SIZE, type MovementListParams } from "./schemas";

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
