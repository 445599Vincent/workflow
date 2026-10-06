import type { NextRequest } from "next/server";

import { buildReportTable, reportFileName, reportToCsv } from "@/features/reports/definitions";
import { getReport } from "@/features/reports/queries";
import { parseReportParams } from "@/features/reports/schemas";
import { getCurrentUser } from "@/lib/auth/session";

/** CSV download of the report on screen, same filters (REP-07, D-031). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autenticado.", { status: 401 });

  const params = parseReportParams(request.nextUrl.searchParams);
  const table = buildReportTable(await getReport(params));
  const fileName = reportFileName(params.view, params.from, params.to);

  return new Response(reportToCsv(table), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
