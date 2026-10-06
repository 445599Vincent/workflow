"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fromDatabaseError, validationFailed, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { ADJUSTMENT_REASONS, adjustmentFormSchema, type AdjustmentFormValues } from "./schemas";

/**
 * Positive or negative adjustment through the create_inventory_adjustment RPC
 * (inventory.adjust). Stock limits and the negative-stock override
 * (inventory.allow_negative) are enforced by the database.
 */
export async function createAdjustment(values: AdjustmentFormValues): Promise<ActionResult> {
  const parsed = adjustmentFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  const isIncrease = input.direction === "in";

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_inventory_adjustment", {
    p_material_id: input.materialId,
    p_movement_type: isIncrease ? "adjustment_in" : "adjustment_out",
    p_quantity: input.quantity,
    p_reason: ADJUSTMENT_REASONS[input.reason],
    p_unit_cost: isIncrease && input.unitCost !== null ? input.unitCost : undefined,
    p_notes: input.notes ?? undefined,
    p_allow_negative: !isIncrease && input.allowNegative,
  });
  if (error) return fromDatabaseError(error);

  revalidatePath("/materials", "layout");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  redirect(`/materials/${input.materialId}?notice=adjustment-created`);
}
