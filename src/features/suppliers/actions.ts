"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import { fail, fromDatabaseError, validationFailed, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { supplierFormSchema, type SupplierFormValues, type SupplierInput } from "./schemas";

function toRow(input: SupplierInput) {
  return {
    code: input.code,
    name: input.name,
    tax_id: input.taxId,
    contact_name: input.contactName,
    phone: input.phone,
    email: input.email,
    address: input.address,
    notes: input.notes,
    is_active: input.isActive,
  };
}

/** A duplicate code is reported on the field itself. */
function toActionError(error: PostgrestError) {
  if (error.code === "23505" && error.message.includes("suppliers_code_key")) {
    return fail("Revise los campos marcados.", {
      code: ["Ya existe un proveedor con este código."],
    });
  }
  return fromDatabaseError(error);
}

export async function createSupplier(values: SupplierFormValues): Promise<ActionResult> {
  const parsed = supplierFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error) return toActionError(error);

  revalidatePath("/suppliers");
  redirect(`/suppliers/${data.id}?notice=supplier-created`);
}

export async function updateSupplier(
  id: string,
  values: SupplierFormValues,
): Promise<ActionResult> {
  const parsed = supplierFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return toActionError(error);
  // RLS filters the row out when the user lacks suppliers.manage.
  if (!data) return fail("No tiene permiso para editar este proveedor.");

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}?notice=supplier-updated`);
}
