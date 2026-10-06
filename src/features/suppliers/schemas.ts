import { z } from "zod";

import { firstParam } from "@/lib/url";
import {
  EMPTY_PARTY_FORM,
  partyFormSchema,
  type PartyFormValues,
  type PartyInput,
} from "@/lib/party-schema";

export const supplierFormSchema = partyFormSchema("Ingrese el nombre del proveedor.");

export type SupplierFormValues = PartyFormValues;
export type SupplierInput = PartyInput;
export const EMPTY_SUPPLIER_FORM = EMPTY_PARTY_FORM;

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
