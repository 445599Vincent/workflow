"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, fromDatabaseError, ok, validationFailed, type ActionResult } from "@/lib/actions";
import { can, getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMPORT_BYTES, validateMaterialImport, type ImportValidation } from "./import";
import { getMaterialImportCatalogs } from "./queries";
import {
  createMaterialSchema,
  updateMaterialSchema,
  type CreateMaterialFormValues,
  type UpdateMaterialFormValues,
} from "./schemas";

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

// -----------------------------------------------------------------------------
// Catalog import (MAT-01…05, D-033)
// -----------------------------------------------------------------------------
export type MaterialImportPreview = Omit<ImportValidation, "materials">;

async function validateImportFile(text: string): Promise<ActionResult<ImportValidation>> {
  if (!can(await getCurrentUser(), "materials.manage")) {
    return fail("No tiene permiso para importar materiales.");
  }
  if (typeof text !== "string" || text.length > MAX_IMPORT_BYTES) {
    return fail("El archivo es demasiado grande. Divídalo en varios archivos.");
  }
  return ok(validateMaterialImport(text, await getMaterialImportCatalogs()));
}

/** Parses and validates the file without creating anything. */
export async function previewMaterialImport(
  text: string,
): Promise<ActionResult<MaterialImportPreview>> {
  const result = await validateImportFile(text);
  if (!result.ok) return result;
  const { fileErrors, ignoredColumns, rows } = result.data;
  return ok({ fileErrors, ignoredColumns, rows });
}

/**
 * Validates the file again (the catalog may have changed since the preview)
 * and creates every material in one transaction: all or nothing.
 */
export async function importMaterials(text: string): Promise<ActionResult> {
  const result = await validateImportFile(text);
  if (!result.ok) return result;
  const { fileErrors, rows, materials } = result.data;
  if (fileErrors.length > 0 || materials.length !== rows.length) {
    return fail("El archivo tiene errores. Corríjalos y vuelva a cargarlo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("import_materials", { p_rows: materials });
  if (error) return fromDatabaseError(error);

  revalidatePath("/materials");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/materials?notice=materials-imported");
}
