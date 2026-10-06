import { z } from "zod";

import { firstParam } from "@/lib/url";
import { optionalText, optionalUuid, requiredDecimalField } from "@/lib/validation";
import { WASTE_REASONS, type WasteReason } from "./labels";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const positiveQuantity = requiredDecimalField({ min: 0 }).refine(
  (value) => value > 0,
  "Debe ser mayor que cero.",
);

// -----------------------------------------------------------------------------
// Order header
// -----------------------------------------------------------------------------
export const workOrderFormSchema = z.object({
  title: z.string().trim().min(3, "Describa el trabajo.").max(150, "Máximo 150 caracteres."),
  customerId: optionalUuid,
  description: optionalText(2000),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueDate: z
    .string()
    .refine((value) => value === "" || ISO_DATE.test(value), "Fecha no válida.")
    .transform((value) => (value === "" ? null : value)),
  responsibleId: optionalUuid,
  /** Only used when creating (OT starts as draft or pending). */
  initialStatus: z.enum(["draft", "pending"]),
});
export type WorkOrderFormValues = z.input<typeof workOrderFormSchema>;
export type WorkOrderInput = z.output<typeof workOrderFormSchema>;

// -----------------------------------------------------------------------------
// Planning and execution
// -----------------------------------------------------------------------------
export const plannedMaterialSchema = z.object({
  materialId: z.uuid("Seleccione un material."),
  plannedQuantity: positiveQuantity,
  notes: optionalText(200),
});
export type PlannedMaterialValues = z.input<typeof plannedMaterialSchema>;

export const plannedQuantitySchema = z.object({ plannedQuantity: positiveQuantity });
export type PlannedQuantityValues = z.input<typeof plannedQuantitySchema>;

export const movementQuantitySchema = z.object({
  materialId: z.uuid("Seleccione un material."),
  quantity: positiveQuantity,
  notes: optionalText(300),
});
export type MovementQuantityValues = z.input<typeof movementQuantitySchema>;

export const wasteSchema = movementQuantitySchema
  .extend({
    reason: z.enum(Object.keys(WASTE_REASONS) as [WasteReason, ...WasteReason[]], {
      error: "Seleccione el motivo.",
    }),
  })
  .refine((values) => values.reason !== "other" || values.notes !== null, {
    message: "Describa el motivo de la merma.",
    path: ["notes"],
  });
export type WasteValues = z.input<typeof wasteSchema>;

/** Release: empty quantity = release everything reserved on the line. */
export const releaseSchema = z.object({
  quantity: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value === "" || /^\d+(\.\d+)?$/.test(value), "Ingrese un número válido.")
    .transform((value) => (value === "" ? null : Number(value)))
    .refine((value) => value === null || value > 0, "Debe ser mayor que cero."),
  notes: optionalText(300),
});
export type ReleaseValues = z.input<typeof releaseSchema>;

export const statusChangeSchema = z.object({
  status: z.enum([
    "draft",
    "pending",
    "planned",
    "in_production",
    "in_installation",
    "completed",
    "cancelled",
  ]),
  note: optionalText(300),
});
export type StatusChangeValues = z.input<typeof statusChangeSchema>;

export const cancelSchema = z.object({
  note: z
    .string()
    .trim()
    .min(5, "Explique el motivo (mínimo 5 caracteres).")
    .max(300, "Máximo 300 caracteres."),
});
export type CancelValues = z.input<typeof cancelSchema>;

/** Voiding a consumption or a waste record (CON-05, MER-07). */
export const voidUsageSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explique el motivo (mínimo 5 caracteres).")
    .max(300, "Máximo 300 caracteres."),
});
export type VoidUsageValues = z.input<typeof voidUsageSchema>;

// -----------------------------------------------------------------------------
// List filters
// -----------------------------------------------------------------------------
export const WORK_ORDER_LIST_STATUSES = [
  "open",
  "overdue",
  "draft",
  "pending",
  "planned",
  "in_production",
  "in_installation",
  "completed",
  "cancelled",
  "all",
] as const;
export const WORK_ORDERS_PAGE_SIZE = 20;

const workOrderListParamsSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(WORK_ORDER_LIST_STATUSES).catch("open"),
  customer: z.uuid().optional().catch(undefined),
  /** "mine": orders whose responsible is the current user. */
  responsible: z.enum(["mine"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type WorkOrderListParams = z.infer<typeof workOrderListParamsSchema>;

export function parseWorkOrderListParams(
  searchParams: Record<string, string | string[] | undefined>,
): WorkOrderListParams {
  return workOrderListParamsSchema.parse({
    q: firstParam(searchParams.q) ?? "",
    status: firstParam(searchParams.status),
    customer: firstParam(searchParams.customer),
    responsible: firstParam(searchParams.responsible),
    page: firstParam(searchParams.page),
  });
}
