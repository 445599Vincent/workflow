import { z } from "zod";

import { decimalField, optionalText, optionalUuid, requiredDecimalField } from "@/lib/validation";

/**
 * Material form rules, shared by the browser (react-hook-form) and the Server
 * Actions. Quantities are in the material's base unit.
 */
const materialFields = {
  sku: z
    .string()
    .trim()
    .max(40, "Máximo 40 caracteres.")
    .regex(/^[A-Za-z0-9._\-/ ]*$/, "Use solo letras, números, guiones, puntos o barras.")
    .transform((value) => (value === "" ? null : value.toUpperCase())),
  name: z
    .string()
    .trim()
    .min(2, "Ingrese el nombre del material.")
    .max(120, "Máximo 120 caracteres."),
  description: optionalText(1000),
  categoryId: z.uuid("Seleccione una categoría."),
  baseUnitId: z.uuid("Seleccione la unidad de medida."),
  minStock: requiredDecimalField({ min: 0 }),
  maxStock: decimalField({ min: 0 }),
  locationId: optionalUuid,
  primarySupplierId: optionalUuid,
  tracksRemnants: z.boolean(),
};

function maxNotBelowMin(values: { minStock: number; maxStock: number | null }) {
  return values.maxStock === null || values.maxStock >= values.minStock;
}

const maxStockIssue = {
  message: "El stock máximo no puede ser menor que el mínimo.",
  path: ["maxStock"],
};

export const createMaterialSchema = z
  .object({
    ...materialFields,
    openingQuantity: decimalField({ min: 0 }),
    openingUnitCost: decimalField({ min: 0 }),
  })
  .refine(maxNotBelowMin, maxStockIssue)
  .refine((values) => !(values.openingQuantity && values.openingUnitCost === null), {
    message: "Indique el costo unitario de la existencia inicial.",
    path: ["openingUnitCost"],
  });

export const updateMaterialSchema = z
  .object({ ...materialFields, isActive: z.boolean() })
  .refine(maxNotBelowMin, maxStockIssue);

/** Raw form values (text inputs) and parsed values. */
export type CreateMaterialFormValues = z.input<typeof createMaterialSchema>;
export type CreateMaterialInput = z.output<typeof createMaterialSchema>;
export type UpdateMaterialFormValues = z.input<typeof updateMaterialSchema>;
export type UpdateMaterialInput = z.output<typeof updateMaterialSchema>;

// -----------------------------------------------------------------------------
// List filters (URL search params)
// -----------------------------------------------------------------------------
export const MATERIAL_SORT_FIELDS = [
  "sku",
  "name",
  "category_name",
  "stock_on_hand",
  "stock_available",
  "avg_cost",
  "inventory_value",
] as const;
export type MaterialSortField = (typeof MATERIAL_SORT_FIELDS)[number];

export const MATERIAL_STATUS_FILTERS = ["active", "low", "out", "inactive", "all"] as const;
export type MaterialStatusFilter = (typeof MATERIAL_STATUS_FILTERS)[number];

export const MATERIALS_PAGE_SIZE = 20;

export const materialListParamsSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  category: z.uuid().optional().catch(undefined),
  status: z.enum(MATERIAL_STATUS_FILTERS).catch("active"),
  sort: z.enum(MATERIAL_SORT_FIELDS).catch("name"),
  dir: z.enum(["asc", "desc"]).catch("asc"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type MaterialListParams = z.infer<typeof materialListParamsSchema>;

export function parseMaterialListParams(
  searchParams: Record<string, string | string[] | undefined>,
): MaterialListParams {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return materialListParamsSchema.parse({
    q: first(searchParams.q) ?? "",
    category: first(searchParams.category),
    status: first(searchParams.status),
    sort: first(searchParams.sort),
    dir: first(searchParams.dir),
    page: first(searchParams.page),
  });
}

/**
 * Values held by the material form in both modes. Each schema ignores the
 * keys it does not use (opening stock on edit, isActive on create).
 */
export type MaterialFormValues = CreateMaterialFormValues & { isActive: boolean };
