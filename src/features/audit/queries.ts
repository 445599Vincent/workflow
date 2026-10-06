import "server-only";

import { createClient } from "@/lib/supabase/server";
import { AUDIT_PAGE_SIZE, type AuditListParams } from "./schemas";

/** Dominican Republic is UTC-4 all year (no daylight saving time). */
const DR_OFFSET = "-04:00";

/** Audit trail, newest first. RLS limits it to users with audit.view. */
export async function listAuditLogs(params: AuditListParams) {
  const supabase = await createClient();
  const from = (params.page - 1) * AUDIT_PAGE_SIZE;

  let query = supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, action, entity_table, entity_id, summary, old_data, new_data, changed_fields, actor:profiles!audit_logs_actor_id_fkey(full_name)",
      { count: "exact" },
    );
  if (params.entity) query = query.eq("entity_table", params.entity);
  if (params.from) query = query.gte("occurred_at", `${params.from}T00:00:00${DR_OFFSET}`);
  if (params.to) query = query.lte("occurred_at", `${params.to}T23:59:59.999${DR_OFFSET}`);

  const { data, error, count } = await query
    .order("id", { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudo cargar la auditoría: ${error.message}`);

  return {
    rows: data,
    total: count ?? 0,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / AUDIT_PAGE_SIZE)),
  };
}
export type AuditRow = Awaited<ReturnType<typeof listAuditLogs>>["rows"][number];
