import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ReportParams } from "./schemas";

async function usageByMaterial(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_usage_by_material", {
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`No se pudo generar el reporte: ${error.message}`);
  return data;
}

async function ordersCost(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_orders_cost", { p_from: from, p_to: to });
  if (error) throw new Error(`No se pudo generar el reporte: ${error.message}`);
  return data;
}

async function usageByCustomer(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_usage_by_customer", {
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`No se pudo generar el reporte: ${error.message}`);
  return data;
}

/** REP-06: active materials with their value, by category. */
async function inventory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials_overview")
    .select(
      "id, sku, name, category_name, unit_symbol, unit_decimals, stock_on_hand, stock_reserved, stock_available, min_stock, avg_cost, inventory_value, stock_status",
    )
    .eq("is_active", true)
    .order("category_name")
    .order("name");
  if (error) throw new Error(`No se pudo generar el reporte: ${error.message}`);
  return data.map((row) => ({
    sku: row.sku ?? "",
    name: row.name ?? "",
    category: row.category_name ?? "Sin categoría",
    unit_symbol: row.unit_symbol ?? "",
    unit_decimals: row.unit_decimals ?? 4,
    stock_on_hand: row.stock_on_hand ?? 0,
    stock_reserved: row.stock_reserved ?? 0,
    stock_available: row.stock_available ?? 0,
    min_stock: row.min_stock ?? 0,
    avg_cost: row.avg_cost ?? 0,
    inventory_value: row.inventory_value ?? 0,
    stock_status: row.stock_status ?? "ok",
  }));
}

export async function getReport(params: ReportParams) {
  switch (params.view) {
    case "materials":
      return { view: params.view, rows: await usageByMaterial(params.from, params.to) };
    case "orders":
      return { view: params.view, rows: await ordersCost(params.from, params.to) };
    case "customers":
      return { view: params.view, rows: await usageByCustomer(params.from, params.to) };
    case "inventory":
      return { view: params.view, rows: await inventory() };
  }
}
export type Report = Awaited<ReturnType<typeof getReport>>;
