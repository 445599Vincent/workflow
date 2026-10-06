import "server-only";

import { cache } from "react";

import { todayISODate } from "@/lib/format";
import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { OPEN_WORK_ORDER_STATUSES } from "./labels";
import { WORK_ORDERS_PAGE_SIZE, type WorkOrderListParams } from "./schemas";

export async function listWorkOrders(params: WorkOrderListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * WORK_ORDERS_PAGE_SIZE;

  let query = supabase.from("work_orders").select(
    `id, number, title, status, priority, due_date, estimated_material_cost, actual_material_cost, created_at,
       customer:customers(id, name),
       responsible:profiles!work_orders_responsible_id_fkey(full_name)`,
    { count: "exact" },
  );

  const term = sanitizeSearch(params.q);
  if (term) query = query.or(`number.ilike.%${term}%,title.ilike.%${term}%`);
  if (params.customer) query = query.eq("customer_id", params.customer);

  switch (params.status) {
    case "open":
      query = query.in("status", ["draft", ...OPEN_WORK_ORDER_STATUSES]);
      break;
    case "overdue":
      query = query
        .in("status", ["draft", ...OPEN_WORK_ORDER_STATUSES])
        .lt("due_date", todayISODate());
      break;
    case "all":
      break;
    default:
      query = query.eq("status", params.status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + WORK_ORDERS_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron cargar las órdenes: ${error.message}`);

  return {
    rows: data,
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / WORK_ORDERS_PAGE_SIZE)),
  };
}
export type WorkOrderListRow = Awaited<ReturnType<typeof listWorkOrders>>["rows"][number];

/** Deduplicated per request (generateMetadata + page). */
export const getWorkOrder = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select(
      `id, number, title, description, status, priority, due_date, customer_id, responsible_id,
       started_at, completed_at, cancelled_at, cancel_reason, estimated_material_cost, actual_material_cost,
       created_at, updated_at,
       customer:customers(id, name),
       responsible:profiles!work_orders_responsible_id_fkey(full_name),
       creator:profiles!work_orders_created_by_fkey(full_name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la orden: ${error.message}`);
  return data;
});
export type WorkOrderDetail = NonNullable<Awaited<ReturnType<typeof getWorkOrder>>>;

export async function getWorkOrderLines(workOrderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_materials")
    .select(
      `id, material_id, planned_quantity, estimated_unit_cost, estimated_total_cost, reserved_quantity,
       consumed_quantity, waste_quantity, actual_cost, is_planned, notes,
       material:materials(sku, name, stock_available, avg_cost, unit:units(symbol, name, decimals))`,
    )
    .eq("work_order_id", workOrderId)
    .order("is_planned", { ascending: false })
    .order("created_at");
  if (error) throw new Error(`No se pudieron cargar los materiales de la orden: ${error.message}`);

  return data.map((line) => ({
    ...line,
    usedQuantity: line.consumed_quantity + line.waste_quantity,
    unitSymbol: line.material.unit.symbol,
    unitName: line.material.unit.name,
    unitDecimals: line.material.unit.decimals,
  }));
}
export type WorkOrderLine = Awaited<ReturnType<typeof getWorkOrderLines>>[number];

export async function getWorkOrderEvents(workOrderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_events")
    .select(
      "id, event_type, from_status, to_status, payload, note, created_at, author:profiles(full_name)",
    )
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`No se pudo cargar el historial: ${error.message}`);
  return data;
}
export type WorkOrderEvent = Awaited<ReturnType<typeof getWorkOrderEvents>>[number];

/** Customers and active users for the order form. */
export async function getWorkOrderFormOptions() {
  const supabase = await createClient();
  const [customers, people] = await Promise.all([
    supabase.from("customers").select("id, name, is_active").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, is_active")
      .eq("is_active", true)
      .order("full_name"),
  ]);
  if (customers.error)
    throw new Error(`No se pudieron cargar los clientes: ${customers.error.message}`);
  if (people.error) throw new Error(`No se pudieron cargar los usuarios: ${people.error.message}`);
  return { customers: customers.data, people: people.data };
}
export type WorkOrderFormOptions = Awaited<ReturnType<typeof getWorkOrderFormOptions>>;

/** Cost of the order's (non-voided) waste: part of the actual cost (MER-02). */
export async function getWorkOrderWasteCost(workOrderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waste_records")
    .select("total_cost")
    .eq("work_order_id", workOrderId)
    .is("voided_at", null);
  if (error) throw new Error(`No se pudo cargar la merma de la orden: ${error.message}`);
  return data.reduce((sum, row) => sum + row.total_cost, 0);
}

/** consumption_variance_alert_pct from app_settings (CON-04), 10 % by default. */
export async function getVarianceAlertPct() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "consumption_variance_alert_pct")
    .maybeSingle();
  const value = Number(data?.value);
  return Number.isFinite(value) && value > 0 ? value : 10;
}
