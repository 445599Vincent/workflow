import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/features/dashboard/components/kpi-grid";
import { RecentOrdersCard } from "@/features/dashboard/components/recent-orders-card";
import { StockAlertsCard } from "@/features/dashboard/components/stock-alerts-card";
import { TopConsumptionCard } from "@/features/dashboard/components/top-consumption-card";
import {
  getDashboardSummary,
  getRecentWorkOrders,
  getStockAlerts,
  getTopConsumedMaterials,
} from "@/features/dashboard/queries";
import { can, requireUser } from "@/lib/auth/session";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [summary, alerts, orders, topConsumed] = await Promise.all([
    getDashboardSummary(),
    getStockAlerts(),
    getRecentWorkOrders(),
    getTopConsumedMaterials(),
  ]);
  const firstName = user.fullName.split(" ")[0];
  const today = formatLongDate();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={today.charAt(0).toUpperCase() + today.slice(1)}
        title={`Hola, ${firstName}`}
        description="Resumen de inventario y órdenes de trabajo."
        actions={
          can(user, "materials.manage") && (
            <Button asChild>
              <Link href="/materials/new">
                <PlusIcon />
                Nuevo material
              </Link>
            </Button>
          )
        }
      />
      <KpiGrid summary={summary} />
      <div className="grid gap-6 lg:grid-cols-2">
        <StockAlertsCard alerts={alerts} />
        <RecentOrdersCard orders={orders} />
      </div>
      <TopConsumptionCard rows={topConsumed} />
    </div>
  );
}
