"use server";

import { revalidatePath } from "next/cache";

import { fail, fromDatabaseError, ok, validationFailed, type ActionResult } from "@/lib/actions";
import { partyToRow } from "@/lib/party-schema";
import { createClient } from "@/lib/supabase/server";
import { customerFormSchema, type CustomerFormValues } from "./schemas";

export async function saveCustomer(
  id: string | null,
  values: CustomerFormValues,
): Promise<ActionResult> {
  const parsed = customerFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const row = partyToRow(parsed.data);

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("customers").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("customers").insert(row).select("id").maybeSingle();
  if (error) {
    if (error.code === "23505" && error.message.includes("customers_code_key")) {
      return fail("Revise los campos marcados.", {
        code: ["Ya existe un cliente con este código."],
      });
    }
    return fromDatabaseError(error);
  }
  if (!data) return fail("No tiene permiso para modificar clientes.");

  revalidatePath("/customers");
  revalidatePath("/work-orders", "layout");
  return ok(undefined);
}
