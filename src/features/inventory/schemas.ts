import { z } from "zod";

import { firstParam } from "@/lib/url";
import { decimalField, optionalText, requiredDecimalField } from "@/lib/validation";
import { MOVEMENT_TYPES, type MovementType } from "./labels";

// -----------------------------------------------------------------------------
// Inventory adjustments
// -----------------------------------------------------------------------------
export const ADJUSTMENT_REASONS = {
  physical_count: "Conteo físico",
  record_correction: "Corrección de un registro",
  found_material: "Material encontrado / sobrante",
  other: "Otro",
} as const;
export type AdjustmentReason = keyof typeof ADJUSTMENT_REASONS;

export const adjustmentFormSchema = z
  .object({
    materialId: z.uuid("Seleccione un material."),
    direction: z.enum(["in", "out"], { error: "Indique si el ajuste suma o resta." }),
    quantity: requiredDecimalField({ min: 0 }).refine(
      (value) => value > 0,
      "Debe ser mayor que cero.",
    ),
    reason: z.enum(Object.keys(ADJUSTMENT_REASONS) as [AdjustmentReason, ...AdjustmentReason[]], {
      error: "Seleccione el motivo.",
    }),
    unitCost: decimalField({ min: 0 }),
    notes: optionalText(300),
    allowNegative: z.boolean(),
  })
  .refine((values) => values.reason !== "other" || values.notes !== null, {
    message: "Describa el motivo del ajuste.",
    path: ["notes"],
  });

export type AdjustmentFormValues = z.input<typeof adjustmentFormSchema>;
export type AdjustmentInput = z.output<typeof adjustmentFormSchema>;

// -----------------------------------------------------------------------------
// Movements list (global ledger)
// -----------------------------------------------------------------------------
export const MOVEMENTS_PAGE_SIZE = 30;

const MOVEMENT_TYPE_VALUES = Object.keys(MOVEMENT_TYPES) as [MovementType, ...MovementType[]];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z.string().regex(ISO_DATE).optional().catch(undefined);

const movementListParamsSchema = z.object({
  q: z.string().trim().max(60).catch(""),
  type: z.enum(MOVEMENT_TYPE_VALUES).optional().catch(undefined),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).catch(1),
});
export type MovementListParams = z.infer<typeof movementListParamsSchema>;

export function parseMovementListParams(
  searchParams: Record<string, string | string[] | undefined>,
): MovementListParams {
  return movementListParamsSchema.parse({
    q: firstParam(searchParams.q) ?? "",
    type: firstParam(searchParams.type),
    from: firstParam(searchParams.from),
    to: firstParam(searchParams.to),
    page: firstParam(searchParams.page),
  });
}

// -----------------------------------------------------------------------------
// Waste list (order and warehouse waste, MER)
// -----------------------------------------------------------------------------
export const WASTE_PAGE_SIZE = 30;

export const WASTE_SCOPES = {
  all: "Todas las mermas",
  orders: "De órdenes de trabajo",
  warehouse: "De almacén",
} as const;
export type WasteScope = keyof typeof WASTE_SCOPES;

const wasteListParamsSchema = z.object({
  scope: z.enum(Object.keys(WASTE_SCOPES) as [WasteScope, ...WasteScope[]]).catch("all"),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).catch(1),
});
export type WasteListParams = z.infer<typeof wasteListParamsSchema>;

export function parseWasteListParams(
  searchParams: Record<string, string | string[] | undefined>,
): WasteListParams {
  return wasteListParamsSchema.parse({
    scope: firstParam(searchParams.scope),
    from: firstParam(searchParams.from),
    to: firstParam(searchParams.to),
    page: firstParam(searchParams.page),
  });
}
