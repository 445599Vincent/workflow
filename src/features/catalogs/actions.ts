"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { fail, fromDatabaseError, ok, validationFailed, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import {
  categoryFormSchema,
  locationFormSchema,
  thresholdsSchema,
  unitFormSchema,
  type CategoryFormValues,
  type LocationFormValues,
  type ThresholdsFormValues,
  type UnitFormValues,
} from "./schemas";

/** Duplicate names/codes are reported on the field that caused them. */
function catalogError(error: PostgrestError, field: string, label: string): ActionResult {
  if (error.code === "23505") {
    return fail("Revise los campos marcados.", { [field]: [`Ya existe ${label}.`] });
  }
  return fromDatabaseError(error);
}

/** No row back means RLS filtered it: the user lacks catalog.manage. */
const NO_PERMISSION = "No tiene permiso para modificar catálogos.";

function revalidateCatalogs(path: string) {
  revalidatePath(path);
  revalidatePath("/settings");
  revalidatePath("/materials", "layout");
}

export async function saveCategory(
  id: string | null,
  values: CategoryFormValues,
): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const row = {
    name: parsed.data.name,
    description: parsed.data.description,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("categories").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("categories").insert(row).select("id").maybeSingle();
  if (error) return catalogError(error, "name", "una categoría con ese nombre");
  if (!data) return fail(NO_PERMISSION);

  revalidateCatalogs("/settings/categories");
  return ok(undefined);
}

export async function saveUnit(id: string | null, values: UnitFormValues): Promise<ActionResult> {
  const parsed = unitFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  // Code and kind are fixed once created (other records depend on them).
  const { data, error } = id
    ? await supabase
        .from("units")
        .update({
          name: input.name,
          symbol: input.symbol,
          decimals: input.decimals,
          is_active: input.isActive,
        })
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("units")
        .insert({
          code: input.code,
          name: input.name,
          symbol: input.symbol,
          kind: input.kind,
          decimals: input.decimals,
          is_active: input.isActive,
        })
        .select("id")
        .maybeSingle();
  if (error) return catalogError(error, "code", "una unidad con ese código");
  if (!data) return fail(NO_PERMISSION);

  revalidateCatalogs("/settings/units");
  return ok(undefined);
}

export async function saveLocation(
  id: string | null,
  values: LocationFormValues,
): Promise<ActionResult> {
  const parsed = locationFormSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const row = {
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description,
    is_active: parsed.data.isActive,
  };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("locations").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("locations").insert(row).select("id").maybeSingle();
  if (error) return catalogError(error, "code", "una ubicación con ese código");
  if (!data) return fail(NO_PERMISSION);

  revalidateCatalogs("/settings/locations");
  return ok(undefined);
}

/**
 * Alert thresholds (CON-04, MER-06). RLS lets only settings.manage update
 * app_settings; every change is audited by the table trigger.
 */
export async function updateThresholds(values: ThresholdsFormValues): Promise<ActionResult> {
  const parsed = thresholdsSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  for (const [key, value] of [
    ["consumption_variance_alert_pct", parsed.data.varianceAlertPct],
    ["waste_alert_pct", parsed.data.wasteAlertPct],
  ] as const) {
    const { data, error } = await supabase
      .from("app_settings")
      .update({ value })
      .eq("key", key)
      .select("key");
    if (error) return fromDatabaseError(error);
    if (!data?.length) return fail("No tiene permiso para cambiar la configuración.");
  }

  revalidatePath("/settings");
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/work-orders", "layout");
  return ok(undefined);
}
