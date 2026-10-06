import Link from "next/link";
import { PackageCheckIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatQuantityWithUnit } from "@/lib/format";
import type { getStockAlerts } from "../queries";

type Alerts = Awaited<ReturnType<typeof getStockAlerts>>;

export function StockAlertsCard({ alerts }: { alerts: Alerts }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de inventario</CardTitle>
        <CardDescription>Materiales sin existencia o bajo el mínimo</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/materials?status=low">Ver todos</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {alerts.length === 0 ? (
          <EmptyState
            icon={PackageCheckIcon}
            title="Todo en orden"
            description="Ningún material está por debajo de su stock mínimo."
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {alerts.map((material) => (
              <li key={material.id}>
                <Link
                  href={`/materials/${material.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{material.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {material.sku} · Mínimo{" "}
                      {formatQuantityWithUnit(
                        material.min_stock,
                        material.unit_symbol,
                        material.unit_decimals ?? 4,
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatQuantityWithUnit(
                        material.stock_available,
                        material.unit_symbol,
                        material.unit_decimals ?? 4,
                      )}
                    </span>
                    {material.stock_status === "out" ? (
                      <Badge variant="destructive">Sin existencia</Badge>
                    ) : (
                      <Badge variant="warning">Bajo mínimo</Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
