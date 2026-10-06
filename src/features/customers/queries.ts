import "server-only";

import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { CUSTOMERS_PAGE_SIZE, type CustomerListParams } from "./schemas";

export async function listCustomers(params: CustomerListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * CUSTOMERS_PAGE_SIZE;

  let query = supabase
    .from("customers")
    .select(
      "id, code, name, tax_id, contact_name, phone, email, address, notes, is_active, work_orders(count)",
      { count: "exact" },
    );
  const term = sanitizeSearch(params.q);
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,code.ilike.%${term}%,tax_id.ilike.%${term}%,contact_name.ilike.%${term}%`,
    );
  }
  if (params.status !== "all") query = query.eq("is_active", params.status === "active");

  const { data, error, count } = await query
    .order("name")
    .range(from, from + CUSTOMERS_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);

  return {
    rows: data.map(({ work_orders, ...row }) => ({
      ...row,
      orderCount: work_orders[0]?.count ?? 0,
    })),
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / CUSTOMERS_PAGE_SIZE)),
  };
}
export type CustomerRow = Awaited<ReturnType<typeof listCustomers>>["rows"][number];

/** Active customers for selects. */
export async function listCustomerOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, is_active")
    .order("name");
  if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
  return data;
}
export type CustomerOption = Awaited<ReturnType<typeof listCustomerOptions>>[number];
