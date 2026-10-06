import "server-only";

import { cache } from "react";

import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { SUPPLIERS_PAGE_SIZE, type SupplierListParams } from "./schemas";

export async function listSuppliers(params: SupplierListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * SUPPLIERS_PAGE_SIZE;

  let query = supabase
    .from("suppliers")
    .select("id, code, name, tax_id, contact_name, phone, email, is_active, materials(count)", {
      count: "exact",
    });

  const term = sanitizeSearch(params.q);
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,code.ilike.%${term}%,tax_id.ilike.%${term}%,contact_name.ilike.%${term}%`,
    );
  }
  if (params.status !== "all") query = query.eq("is_active", params.status === "active");

  const { data, error, count } = await query
    .order("name")
    .range(from, from + SUPPLIERS_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron cargar los proveedores: ${error.message}`);

  return {
    rows: data.map(({ materials, ...row }) => ({
      ...row,
      materialCount: materials[0]?.count ?? 0,
    })),
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / SUPPLIERS_PAGE_SIZE)),
  };
}

export type SupplierListRow = Awaited<ReturnType<typeof listSuppliers>>["rows"][number];

/** Deduplicated per request (generateMetadata + page). */
export const getSupplier = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, code, name, tax_id, contact_name, phone, email, address, notes, is_active, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el proveedor: ${error.message}`);
  return data;
});

export type SupplierDetail = NonNullable<Awaited<ReturnType<typeof getSupplier>>>;

/** Materials that list this supplier as their primary supplier. */
export async function getSupplierMaterials(supplierId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials_overview")
    .select("id, sku, name, unit_symbol, unit_decimals, stock_available, last_cost, stock_status")
    .eq("primary_supplier_id", supplierId)
    .order("name")
    .limit(50);
  if (error) throw new Error(`No se pudieron cargar los materiales: ${error.message}`);
  return data;
}

export const SUPPLIER_RECENT_RECEIPTS = 10;

export async function getSupplierReceipts(supplierId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_receipts")
    .select("id, number, receipt_date, invoice_number, total_cost, voided_at")
    .eq("supplier_id", supplierId)
    .order("receipt_date", { ascending: false })
    .order("number", { ascending: false })
    .limit(SUPPLIER_RECENT_RECEIPTS);
  if (error) throw new Error(`No se pudieron cargar las entradas: ${error.message}`);
  return data;
}

/** Active suppliers for selects (receipts, materials). */
export async function listSupplierOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`No se pudieron cargar los proveedores: ${error.message}`);
  return data;
}
