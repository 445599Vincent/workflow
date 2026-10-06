"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, fromDatabaseError, ok, validationFailed, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import {
  cancelSchema,
  movementQuantitySchema,
  plannedMaterialSchema,
  plannedQuantitySchema,
  releaseSchema,
  statusChangeSchema,
  wasteSchema,
  workOrderFormSchema,
  type CancelValues,
  type MovementQuantityValues,
  type PlannedMaterialValues,
  type PlannedQuantityValues,
  type ReleaseValues,
  type StatusChangeValues,
  type WasteValues,
  type WorkOrderFormValues,
} from "./schemas";

/** Every execution action changes stock, costs and the order page. */
function revalidateOrder(workOrderId: string) {
  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");
  revalidatePath("/materials", "layout");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

async function lineOrderId(lineId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("work_order_materials")
    .select("work_order_id")
    .eq("id", lineId)
    .maybeSingle();
  return data?.work_order_id ?? null;
}

// -----------------------------------------------------------------------------
// Order header
// -----------------------------------------------------------------------------
export async function createWorkOrder(values: WorkOrderFormValues): Promise<ActionResult> {
  const parsed = workOrderFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      title: input.title,
      customer_id: input.customerId,
      description: input.description,
      priority: input.priority,
      due_date: input.dueDate,
      responsible_id: input.responsibleId,
      status: input.initialStatus,
    })
    .select("id")
    .single();
  if (error) return fromDatabaseError(error);

  revalidatePath("/work-orders");
  revalidatePath("/dashboard");
  redirect(`/work-orders/${data.id}?notice=work-order-created`);
}

export async function updateWorkOrder(
  id: string,
  values: WorkOrderFormValues,
): Promise<ActionResult> {
  const parsed = workOrderFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update({
      title: input.title,
      customer_id: input.customerId,
      description: input.description,
      priority: input.priority,
      due_date: input.dueDate,
      responsible_id: input.responsibleId,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fromDatabaseError(error);
  if (!data) return fail("No tiene permiso para editar órdenes.");

  revalidateOrder(id);
  redirect(`/work-orders/${id}?notice=work-order-updated`);
}

export async function changeWorkOrderStatus(
  id: string,
  values: StatusChangeValues,
): Promise<ActionResult> {
  const parsed = statusChangeSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_work_order_status", {
    p_work_order_id: id,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return fromDatabaseError(error);

  revalidateOrder(id);
  return ok(undefined);
}

export async function cancelWorkOrder(id: string, values: CancelValues): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  return changeWorkOrderStatus(id, { status: "cancelled", note: parsed.data.note });
}

// -----------------------------------------------------------------------------
// Planned materials (PLN)
// -----------------------------------------------------------------------------
export async function addPlannedMaterial(
  workOrderId: string,
  values: PlannedMaterialValues,
): Promise<ActionResult> {
  const parsed = plannedMaterialSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_materials")
    .insert({
      work_order_id: workOrderId,
      material_id: parsed.data.materialId,
      planned_quantity: parsed.data.plannedQuantity,
      notes: parsed.data.notes,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return fail("Revise los campos marcados.", {
        materialId: ["Este material ya está en la orden; edite su cantidad en la lista."],
      });
    }
    return fromDatabaseError(error);
  }
  if (!data) return fail("No tiene permiso para planificar materiales.");

  revalidateOrder(workOrderId);
  return ok(undefined);
}

export async function updatePlannedQuantity(
  lineId: string,
  values: PlannedQuantityValues,
): Promise<ActionResult> {
  const parsed = plannedQuantitySchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_materials")
    .update({ planned_quantity: parsed.data.plannedQuantity })
    .eq("id", lineId)
    .select("work_order_id")
    .maybeSingle();
  if (error) return fromDatabaseError(error);
  if (!data) return fail("No tiene permiso para planificar materiales.");

  revalidateOrder(data.work_order_id);
  return ok(undefined);
}

export async function removePlannedMaterial(lineId: string): Promise<ActionResult> {
  const workOrderId = await lineOrderId(lineId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_order_materials")
    .delete()
    .eq("id", lineId)
    .select("id");
  if (error) return fromDatabaseError(error);
  if (!data?.length) return fail("No tiene permiso para quitar materiales de la orden.");

  if (workOrderId) revalidateOrder(workOrderId);
  return ok(undefined);
}

// -----------------------------------------------------------------------------
// Execution: reservations, consumption and waste (RES, CON, MER)
// -----------------------------------------------------------------------------
export async function reserveMaterial(
  lineId: string,
  values: MovementQuantityValues,
): Promise<ActionResult> {
  const parsed = movementQuantitySchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_material", {
    p_work_order_material_id: lineId,
    p_quantity: parsed.data.quantity,
    p_notes: parsed.data.notes ?? undefined,
  });
  if (error) return fromDatabaseError(error);

  revalidateOrder(data.work_order_id);
  return ok(undefined);
}

export async function releaseReservation(
  lineId: string,
  values: ReleaseValues,
): Promise<ActionResult> {
  const parsed = releaseSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const workOrderId = await lineOrderId(lineId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("release_reservation", {
    p_work_order_material_id: lineId,
    p_quantity: parsed.data.quantity ?? undefined,
    p_notes: parsed.data.notes ?? undefined,
  });
  if (error) return fromDatabaseError(error);

  if (workOrderId) revalidateOrder(workOrderId);
  return ok(undefined);
}

export async function consumeMaterial(
  workOrderId: string,
  values: MovementQuantityValues,
): Promise<ActionResult> {
  const parsed = movementQuantitySchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("consume_material", {
    p_work_order_id: workOrderId,
    p_material_id: parsed.data.materialId,
    p_quantity: parsed.data.quantity,
    p_notes: parsed.data.notes ?? undefined,
  });
  if (error) return fromDatabaseError(error);

  revalidateOrder(workOrderId);
  return ok(undefined);
}

export async function registerWaste(
  workOrderId: string,
  values: WasteValues,
): Promise<ActionResult> {
  const parsed = wasteSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_waste", {
    p_work_order_id: workOrderId,
    p_material_id: parsed.data.materialId,
    p_quantity: parsed.data.quantity,
    p_reason: parsed.data.reason,
    p_notes: parsed.data.notes ?? undefined,
  });
  if (error) return fromDatabaseError(error);

  revalidateOrder(workOrderId);
  return ok(undefined);
}
