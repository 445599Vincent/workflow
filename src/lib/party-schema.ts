import { z } from "zod";

import { optionalText } from "@/lib/validation";

/**
 * Fields shared by suppliers and customers (companies or people Workflow buys
 * from or works for). Both tables have the same columns.
 */
export function partyFormSchema(nameRequiredMessage: string) {
  return z.object({
    code: z
      .string()
      .trim()
      .max(20, "Máximo 20 caracteres.")
      .regex(/^[A-Za-z0-9._\-/]*$/, "Use solo letras, números, guiones o puntos.")
      .transform((value) => (value === "" ? null : value.toUpperCase())),
    name: z.string().trim().min(2, nameRequiredMessage).max(150, "Máximo 150 caracteres."),
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
}

export type PartyFormValues = z.input<ReturnType<typeof partyFormSchema>>;
export type PartyInput = z.output<ReturnType<typeof partyFormSchema>>;

export const EMPTY_PARTY_FORM: PartyFormValues = {
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

/** Row shape shared by suppliers and customers tables. */
export function partyToRow(input: PartyInput) {
  return {
    code: input.code,
    name: input.name,
    tax_id: input.taxId,
    contact_name: input.contactName,
    phone: input.phone,
    email: input.email,
    address: input.address,
    notes: input.notes,
    is_active: input.isActive,
  };
}
