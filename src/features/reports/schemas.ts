import { z } from "zod";

import { todayISODate } from "@/lib/format";
import { firstParam } from "@/lib/url";

export const REPORT_VIEWS = {
  materials: "Consumo por material",
  orders: "Costo por orden",
  customers: "Consumo por cliente",
  inventory: "Inventario actual",
} as const;
export type ReportView = keyof typeof REPORT_VIEWS;

/** Reports that depend on a period (REP-02); the inventory is a snapshot. */
export function usesPeriod(view: ReportView) {
  return view !== "inventory";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const reportParamsSchema = z.object({
  view: z.enum(Object.keys(REPORT_VIEWS) as [ReportView, ...ReportView[]]).catch("materials"),
  from: z.string().regex(ISO_DATE).catch(""),
  to: z.string().regex(ISO_DATE).catch(""),
});
export type ReportParams = z.infer<typeof reportParamsSchema>;

/** Default period: from the 1st of the current month to today (business time zone). */
export function parseReportParams(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): ReportParams {
  const read = (key: string) =>
    searchParams instanceof URLSearchParams
      ? (searchParams.get(key) ?? undefined)
      : firstParam(searchParams[key]);
  const today = todayISODate();
  const params = reportParamsSchema.parse({
    view: read("view"),
    from: read("from"),
    to: read("to"),
  });
  const to = params.to || today;
  const from = params.from || `${today.slice(0, 8)}01`;
  return { view: params.view, from: from <= to ? from : to, to };
}
