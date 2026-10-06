import { ChartColumnIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatQuantityWithUnit } from "@/lib/format";
import type { getTopConsumedMaterials } from "../queries";

type Rows = Awaited<ReturnType<typeof getTopConsumedMaterials>>;

export function TopConsumptionCard({ rows }: { rows: Rows }) {
  const max = Math.max(...rows.map((row) => row.total_cost), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materiales con mayor consumo</CardTitle>
        <CardDescription>Consumo + merma del mes, por costo</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={ChartColumnIcon}
            title="Sin consumos este mes"
            description="Cuando se registren consumos en órdenes de trabajo verá aquí los materiales más usados."
            className="py-8"
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.material_id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="truncate font-medium" title={row.name}>
                    {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(row.total_cost)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-teal"
                    style={{ width: `${max > 0 ? Math.max(4, (row.total_cost / max) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatQuantityWithUnit(row.quantity, row.unit_symbol, row.unit_decimals)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
