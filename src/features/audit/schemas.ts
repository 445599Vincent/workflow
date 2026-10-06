import { z } from "zod";

import { firstParam } from "@/lib/url";
import { AUDIT_ENTITIES } from "./labels";

export const AUDIT_PAGE_SIZE = 40;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z.string().regex(ISO_DATE).optional().catch(undefined);

const auditListParamsSchema = z.object({
  entity: z
    .string()
    .refine((value) => value in AUDIT_ENTITIES)
    .optional()
    .catch(undefined),
  from: optionalDate,
  to: optionalDate,
  page: z.coerce.number().int().min(1).catch(1),
});
export type AuditListParams = z.infer<typeof auditListParamsSchema>;

export function parseAuditListParams(
  searchParams: Record<string, string | string[] | undefined>,
): AuditListParams {
  return auditListParamsSchema.parse({
    entity: firstParam(searchParams.entity),
    from: firstParam(searchParams.from),
    to: firstParam(searchParams.to),
    page: firstParam(searchParams.page),
  });
}
