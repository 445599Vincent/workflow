import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const summarySchema = z.object({
  active_work_orders: z.coerce.number(),
  overdue_work_orders: z.coerce.number(),
  completed_this_month: z.coerce.number(),
  inventory_value: z.coerce.number(),
  active_materials: z.coerce.number(),
  low_stock_materials: z.coerce.number(),
  consumption_cost_month: z.coerce.number(),
  waste_cost_month: z.coerce.number(),
  estimated_cost_completed_month: z.coerce.number(),
  actual_cost_completed_month: z.coerce.number(),
});

export type DashboardSummary = z.infer<typeof summarySchema>;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_summary");
  if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);
  return summarySchema.parse(data);
}

export async function getStockAlerts(limit = 6) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials_overview")
    .select("id, sku, name, unit_symbol, unit_decimals, stock_available, min_stock, stock_status")
    .in("stock_status", ["out", "low"])
    .order("stock_available", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`No se pudieron cargar las alertas: ${error.message}`);
  return data;
}

export async function getRecentWorkOrders(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, number, title, status, priority, due_date, customer:customers(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudieron cargar las órdenes: ${error.message}`);
  return data;
}

export async function getTopConsumedMaterials(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_top_consumed_materials", { p_limit: limit });
  if (error) throw new Error(`No se pudo cargar el consumo: ${error.message}`);
  return data;
}
