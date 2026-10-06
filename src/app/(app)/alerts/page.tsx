import type { Metadata } from "next";
import Link from "next/link";
import { BellOffIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { AlertsList } from "@/features/alerts/components/alerts-list";
import { AlertsSummary } from "@/features/alerts/components/alerts-summary";
import { ALERT_KINDS, isAlertKind } from "@/features/alerts/labels";
import { countAlerts, getAlerts } from "@/features/alerts/queries";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/url";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage({ searchParams }: PageProps<"/alerts">) {
  await requireUser();
  const requested = firstParam((await searchParams).kind);
  const kind = isAlertKind(requested) ? requested : null;
  const alerts = await getAlerts();
  const shown = kind ? alerts.filter((alert) => alert.kind === kind) : alerts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        description="Se calculan en el momento con los umbrales de Configuración. Las críticas van primero."
      />
      <AlertsSummary counts={countAlerts(alerts)} />

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
          <div>
            <h2 className="font-semibold">
              {kind ? ALERT_KINDS[kind].label : "Todas las alertas"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {kind ? ALERT_KINDS[kind].description : `${alerts.length} alertas activas.`}
            </p>
          </div>
          {kind && (
            <Link href="/alerts" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          )}
        </div>
        {shown.length > 0 ? (
          <AlertsList alerts={shown} />
        ) : (
          <EmptyState
            icon={BellOffIcon}
            title="Sin alertas"
            description="Todo en orden por ahora."
          />
        )}
      </Card>
    </div>
  );
}
