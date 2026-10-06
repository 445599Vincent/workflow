import { z } from "zod";

import { firstParam } from "@/lib/url";
import { optionalText } from "@/lib/validation";

export const supplierFormSchema = z.object({
  code: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres.")
    .regex(/^[A-Za-z0-9._\-/]*$/, "Use solo letras, números, guiones o puntos.")
    .transform((value) => (value === "" ? null : value.toUpperCase())),
  name: z
    .string()
    .trim()
    .min(2, "Ingrese el nombre del proveedor.")
    .max(150, "Máximo 150 caracteres."),
  taxId: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres.")
    .regex(/^[A-Za-z0-9-]*$/, "Use solo números y guiones (ej. 1-01-12345-6).")
    .transform((value) => (value === "" ? null : value)),
  contactName: optionalText(120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(160, "Máximo 160 caracteres.")
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Ingrese un correo electrónico válido.",
    })
    .transform((value) => (value === "" ? null : value.toLowerCase())),
  address: optionalText(300),
  notes: optionalText(1000),
  isActive: z.boolean(),
});

export type SupplierFormValues = z.input<typeof supplierFormSchema>;
export type SupplierInput = z.output<typeof supplierFormSchema>;

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  code: "",
  name: "",
  taxId: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

// -----------------------------------------------------------------------------
// List filters
// -----------------------------------------------------------------------------
export const SUPPLIER_STATUS_FILTERS = ["active", "inactive", "all"] as const;
export const SUPPLIERS_PAGE_SIZE = 20;

const supplierListParamsSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(SUPPLIER_STATUS_FILTERS).catch("active"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type SupplierListParams = z.infer<typeof supplierListParamsSchema>;

export function parseSupplierListParams(
  searchParams: Record<string, string | string[] | undefined>,
): SupplierListParams {
  return supplierListParamsSchema.parse({
    q: firstParam(searchParams.q) ?? "",
    status: firstParam(searchParams.status),
    page: firstParam(searchParams.page),
  });
}
