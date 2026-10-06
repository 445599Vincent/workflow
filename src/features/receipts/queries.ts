import "server-only";

import { cache } from "react";

import { listMaterialOptions } from "@/features/materials/queries";
import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { RECEIPTS_PAGE_SIZE, type ReceiptListParams } from "./schemas";

export async function listReceipts(params: ReceiptListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * RECEIPTS_PAGE_SIZE;

  let query = supabase
    .from("inventory_receipts")
    .select(
      "id, number, receipt_date, invoice_number, total_cost, voided_at, supplier:suppliers(id, name), lines:inventory_receipt_lines(count)",
      { count: "exact" },
    );

  const term = sanitizeSearch(params.q);
  if (term) query = query.or(`number.ilike.%${term}%,invoice_number.ilike.%${term}%`);
  if (params.supplier) query = query.eq("supplier_id", params.supplier);
  if (params.from) query = query.gte("receipt_date", params.from);
  if (params.to) query = query.lte("receipt_date", params.to);
  if (params.status === "posted") query = query.is("voided_at", null);
  if (params.status === "voided") query = query.not("voided_at", "is", null);

  const { data, error, count } = await query
    .order("receipt_date", { ascending: false })
    .order("number", { ascending: false })
    .range(from, from + RECEIPTS_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron cargar las entradas: ${error.message}`);

  return {
    rows: data.map(({ lines, ...row }) => ({ ...row, lineCount: lines[0]?.count ?? 0 })),
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / RECEIPTS_PAGE_SIZE)),
  };
}

export type ReceiptListRow = Awaited<ReturnType<typeof listReceipts>>["rows"][number];

/** Deduplicated per request (generateMetadata + page). */
export const getReceipt = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_receipts")
    .select(
      `id, number, receipt_date, invoice_number, notes, total_cost, created_at, voided_at, void_reason,
       supplier:suppliers(id, name),
       creator:profiles!inventory_receipts_created_by_fkey(full_name),
       voider:profiles!inventory_receipts_voided_by_fkey(full_name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la entrada: ${error.message}`);
  return data;
});

export type ReceiptDetail = NonNullable<Awaited<ReturnType<typeof getReceipt>>>;

export async function getReceiptLines(receiptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_receipt_lines")
    .select(
      "id, line_no, quantity, unit_cost, line_total, notes, material:materials(id, sku, name), unit:units(symbol, decimals)",
    )
    .eq("receipt_id", receiptId)
    .order("line_no");
  if (error) throw new Error(`No se pudieron cargar las líneas: ${error.message}`);
  return data;
}

export type ReceiptLine = Awaited<ReturnType<typeof getReceiptLines>>[number];

/** Active materials and suppliers for the receipt form. */
export async function getReceiptFormOptions() {
  const supabase = await createClient();
  const [materials, suppliers] = await Promise.all([
    listMaterialOptions(),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
  ]);
  if (suppliers.error) {
    throw new Error(`No se pudieron cargar los proveedores: ${suppliers.error.message}`);
  }
  return { materials, suppliers: suppliers.data };
}

export type ReceiptFormOptions = Awaited<ReturnType<typeof getReceiptFormOptions>>;
