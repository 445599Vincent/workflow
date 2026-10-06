import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { ALERT_ORDER, isAlertKind, type AlertKind } from "./labels";

/** ALR-01..04, computed by the database on every read (deduplicated per request). */
export const getAlerts = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_alerts");
  if (error) throw new Error(`No se pudieron cargar las alertas: ${error.message}`);
  return data
    .filter((row) => isAlertKind(row.kind))
    .map((row) => ({ ...row, kind: row.kind as AlertKind, critical: row.severity === "critical" }));
});
export type Alert = Awaited<ReturnType<typeof getAlerts>>[number];

export function countAlerts(alerts: Alert[]) {
  return Object.fromEntries(
    ALERT_ORDER.map((kind) => [kind, alerts.filter((alert) => alert.kind === kind).length]),
  ) as Record<AlertKind, number>;
}
