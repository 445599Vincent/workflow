import { z } from "zod";

import { todayISODate } from "@/lib/format";
import { firstParam } from "@/lib/url";
import { optionalText, optionalUuid, requiredDecimalField } from "@/lib/validation";

export const MAX_RECEIPT_LINES = 100;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const receiptLineSchema = z.object({
  materialId: z.uuid("Seleccione un material."),
  quantity: requiredDecimalField({ min: 0 }).refine(
    (value) => value > 0,
    "Debe ser mayor que cero.",
  ),
  unitCost: requiredDecimalField({ min: 0 }),
});

export const receiptFormSchema = z.object({
  receiptDate: z
    .string()
    .regex(ISO_DATE, "Seleccione la fecha.")
    .refine((value) => value <= todayISODate(), "La fecha no puede ser futura."),
  supplierId: optionalUuid,
  invoiceNumber: optionalText(40),
  notes: optionalText(500),
  lines: z
    .array(receiptLineSchema)
    .min(1, "Agregue al menos un material.")
    .max(MAX_RECEIPT_LINES, `Máximo ${MAX_RECEIPT_LINES} líneas por entrada.`),
});

export type ReceiptFormValues = z.input<typeof receiptFormSchema>;
export type ReceiptInput = z.output<typeof receiptFormSchema>;

export const EMPTY_RECEIPT_LINE: ReceiptFormValues["lines"][number] = {
  materialId: "",
  quantity: "",
  unitCost: "",
};

export const voidReceiptSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explique brevemente el motivo (mínimo 5 caracteres).")
    .max(300, "Máximo 300 caracteres."),
});
export type VoidReceiptValues = z.input<typeof voidReceiptSchema>;

// -----------------------------------------------------------------------------
// List filters
// -----------------------------------------------------------------------------
export const RECEIPT_STATUS_FILTERS = ["all", "posted", "voided"] as const;
export const RECEIPTS_PAGE_SIZE = 20;

const optionalDate = z.string().regex(ISO_DATE).optional().catch(undefined);

const receiptListParamsSchema = z.object({
  q: z.string().trim().max(60).catch(""),
  supplier: z.uuid().optional().catch(undefined),
  status: z.enum(RECEIPT_STATUS_FILTERS).catch("all"),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).catch(1),
});
export type ReceiptListParams = z.infer<typeof receiptListParamsSchema>;

export function parseReceiptListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ReceiptListParams {
  return receiptListParamsSchema.parse({
    q: firstParam(searchParams.q) ?? "",
    supplier: firstParam(searchParams.supplier),
    status: firstParam(searchParams.status),
    from: firstParam(searchParams.from),
    to: firstParam(searchParams.to),
    page: firstParam(searchParams.page),
  });
}
