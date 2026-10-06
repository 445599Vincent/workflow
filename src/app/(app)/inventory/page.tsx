import type { Metadata } from "next";
import Link from "next/link";
import { BoxesIcon, DownloadIcon, PackageXIcon, TriangleAlertIcon, WalletIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ValuationTable } from "@/features/inventory/components/valuation-table";
import { getInventoryValuation } from "@/features/inventory/queries";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventoryPage() {
  await requireUser();
  const valuation = await getInventoryValuation();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Valor de las existencias (físico × costo promedio) por categoría."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/reports?view=inventory">Detalle por material</Link>
            </Button>
            <Button asChild>
              <a href="/reports/export?view=inventory" download>
                <DownloadIcon />
                Exportar CSV
              </a>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Valor de inventario"
          value={formatMoney(valuation.total)}
          icon={WalletIcon}
        />
        <StatCard
          label="Materiales activos"
          value={valuation.materials}
          icon={BoxesIcon}
          href="/materials"
        />
        <StatCard
          label="Bajo mínimo"
          value={valuation.low}
          icon={TriangleAlertIcon}
          tone={valuation.low > 0 ? "warning" : "success"}
          href="/materials?status=low"
        />
        <StatCard
          label="Sin existencia"
          value={valuation.out}
          icon={PackageXIcon}
          tone={valuation.out > 0 ? "danger" : "success"}
          href="/materials?status=out"
        />
      </div>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Valor por categoría</CardTitle>
        </CardHeader>
        <ValuationTable categories={valuation.categories} total={valuation.total} />
      </Card>
    </div>
  );
}
