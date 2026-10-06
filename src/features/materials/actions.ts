"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, fromDatabaseError, validationFailed, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import {
  createMaterialSchema,
  updateMaterialSchema,
  type CreateMaterialFormValues,
  type UpdateMaterialFormValues,
} from "./schemas";
import { importPayloadSchema, type ImportPayload } from "./import";

/**
 * Creates the material and, when given, its opening stock in one database
 * transaction (RPC create_material). Permission and stock rules are enforced
 * by the database; this action validates input and maps errors.
 */
export async function createMaterial(values: CreateMaterialFormValues): Promise<ActionResult> {
  const parsed = createMaterialSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_material", {
    p_name: input.name,
    p_category_id: input.categoryId,
    p_base_unit_id: input.baseUnitId,
    p_sku: input.sku ?? undefined,
    p_description: input.description ?? undefined,
    p_min_stock: input.minStock,
    p_max_stock: input.maxStock ?? undefined,
    p_location_id: input.locationId ?? undefined,
    p_primary_supplier_id: input.primarySupplierId ?? undefined,
    p_tracks_remnants: input.tracksRemnants,
    p_opening_quantity: input.openingQuantity ?? 0,
    p_opening_unit_cost: input.openingUnitCost ?? 0,
  });

  if (error) return fromDatabaseError(error);

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  redirect(`/materials/${data.id}?notice=material-created`);
}

/** Updates descriptive fields. Stock and costs are never edited here (BR INV-10). */
export async function updateMaterial(
  id: string,
  values: UpdateMaterialFormValues,
): Promise<ActionResult> {
  const parsed = updateMaterialSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .update({
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      base_unit_id: input.baseUnitId,
      min_stock: input.minStock,
      max_stock: input.maxStock,
      location_id: input.locationId,
      primary_supplier_id: input.primarySupplierId,
      tracks_remnants: input.tracksRemnants,
      is_active: input.isActive,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return fromDatabaseError(error);
  // RLS filters the row out when the user lacks materials.manage.
  if (!data) return { ok: false, error: "No tiene permiso para editar este material." };

  revalidatePath("/materials");
  revalidatePath(`/materials/${id}`);
  revalidatePath("/dashboard");
  redirect(`/materials/${id}?notice=material-updated`);
}

/**
 * Bulk import (IMP, D-033). The RPC validates every row and creates all the
 * materials in one transaction, or none.
 */
export async function importMaterials(payload: ImportPayload): Promise<ActionResult> {
  const parsed = importPayloadSchema.safeParse(payload);
  if (!parsed.success) return fail("El archivo tiene datos con un formato inválido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_materials", {
    p_rows: parsed.data.rows,
    p_create_catalogs: parsed.data.createCatalogs,
  });
  if (error) return fromDatabaseError(error);

  revalidatePath("/materials", "layout");
  revalidatePath("/inventory");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  revalidatePath("/settings", "layout");
  redirect(`/materials?notice=materials-imported&count=${data}`);
}
