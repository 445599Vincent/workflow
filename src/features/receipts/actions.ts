"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fromDatabaseError, validationFailed, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import {
  receiptFormSchema,
  voidReceiptSchema,
  type ReceiptFormValues,
  type VoidReceiptValues,
} from "./schemas";

/** Inventory screens that show stock or costs. */
function revalidateInventory() {
  revalidatePath("/receipts", "layout");
  revalidatePath("/materials", "layout");
  revalidatePath("/suppliers", "layout");
  revalidatePath("/dashboard");
}

/**
 * Posts the receipt and all its lines in one transaction (RPC
 * post_inventory_receipt): stock and average cost are updated by the database.
 */
export async function postReceipt(values: ReceiptFormValues): Promise<ActionResult> {
  const parsed = receiptFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_inventory_receipt", {
    p_lines: input.lines.map((line) => ({
      material_id: line.materialId,
      quantity: line.quantity,
      unit_cost: line.unitCost,
    })),
    p_receipt_date: input.receiptDate,
    p_supplier_id: input.supplierId ?? undefined,
    p_invoice_number: input.invoiceNumber ?? undefined,
    p_notes: input.notes ?? undefined,
  });
  if (error) return fromDatabaseError(error);

  revalidateInventory();
  redirect(`/receipts/${data.id}?notice=receipt-posted`);
}

/** Voids a receipt by reversing its lines (BR ENT-05). Never deletes it. */
export async function voidReceipt(id: string, values: VoidReceiptValues): Promise<ActionResult> {
  const parsed = voidReceiptSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_inventory_receipt", {
    p_receipt_id: id,
    p_reason: parsed.data.reason,
  });
  if (error) return fromDatabaseError(error);

  revalidateInventory();
  redirect(`/receipts/${id}?notice=receipt-voided`);
}
