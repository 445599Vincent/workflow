import { z } from "zod";

import { partyFormSchema, type PartyFormValues } from "@/lib/party-schema";
import { firstParam } from "@/lib/url";

export const customerFormSchema = partyFormSchema("Ingrese el nombre del cliente.");
export type CustomerFormValues = PartyFormValues;

export const CUSTOMERS_PAGE_SIZE = 20;

const customerListParamsSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["active", "inactive", "all"]).catch("active"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type CustomerListParams = z.infer<typeof customerListParamsSchema>;

export function parseCustomerListParams(
  searchParams: Record<string, string | string[] | undefined>,
): CustomerListParams {
  return customerListParamsSchema.parse({
    q: firstParam(searchParams.q) ?? "",
    status: firstParam(searchParams.status),
    page: firstParam(searchParams.page),
  });
}
