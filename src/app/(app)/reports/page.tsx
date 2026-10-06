import type { Metadata } from "next";
import { BarChart3Icon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { ReportControls } from "@/features/reports/components/report-controls";
import { ReportTable } from "@/features/reports/components/report-table";
import { buildReportTable } from "@/features/reports/definitions";
import { getReport } from "@/features/reports/queries";
import { parseReportParams, REPORT_VIEWS, usesPeriod } from "@/features/reports/schemas";
import { requireUser } from "@/lib/auth/session";
import { formatPlainDate } from "@/lib/format";

export const metadata: Metadata = { title: "Reportes" };

const DESCRIPTIONS = {
  materials:
    "Consumo útil y merma de cada material en el período. Los registros anulados no cuentan.",
  orders: "Órdenes terminadas en el período: costo estimado contra costo real.",
  customers: "Costo de materiales usados en las órdenes de cada cliente durante el período.",
  inventory: "Existencias y valor de cada material activo (físico × costo promedio).",
} as const;

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireUser();
  const params = parseReportParams(await searchParams);
  const table = buildReportTable(await getReport(params));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Consumo, mermas, costos e inventario. Exportables a Excel (CSV)."
      />
      <ReportControls params={params} />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b px-4 py-3 sm:px-6">
          <h2 className="font-semibold">{REPORT_VIEWS[params.view]}</h2>
          <p className="text-sm text-muted-foreground">
            {DESCRIPTIONS[params.view]}
            {usesPeriod(params.view) &&
              ` Período: ${formatPlainDate(params.from)} – ${formatPlainDate(params.to)}.`}
          </p>
        </div>
        {table.rows.length > 0 ? (
          <ReportTable table={table} />
        ) : (
          <EmptyState
            icon={BarChart3Icon}
            title="Sin datos para este período"
            description="Pruebe con otro rango de fechas."
          />
        )}
      </Card>
    </div>
  );
}
