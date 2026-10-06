import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { VoidUsageDialog } from "@/features/work-orders/components/void-usage-dialog";
import { WASTE_REASONS } from "@/features/work-orders/labels";
import { formatDateTime, formatMoney, formatQuantityWithUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WasteRow } from "../queries";

/**
 * Waste of orders and of the warehouse. Warehouse waste is voided here; order
 * waste is voided from its order (the order must be open, CON-06).
 */
export function WasteList({ rows, canVoid }: { rows: WasteRow[]; canVoid: boolean }) {
  return (
    <ul className="divide-y" data-testid="waste-list">
      {rows.map((row) => {
        const voided = Boolean(row.voided_at);
        const quantity = formatQuantityWithUnit(
          row.quantity,
          row.material.unit.symbol,
          row.material.unit.decimals,
        );
        return (
          <li key={row.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <div className={cn("min-w-0 flex-1 space-y-0.5 text-sm", voided && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/materials/${row.material.id}`}
                  className={cn("font-medium hover:text-primary", voided && "line-through")}
                >
                  {quantity} · {row.material.name}
                </Link>
                <Badge variant="warning">{WASTE_REASONS[row.reason]}</Badge>
                {voided && <Badge variant="destructive">Anulada</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {row.work_order ? (
                  <Link
                    href={`/work-orders/${row.work_order.id}`}
                    className="text-primary hover:underline"
                  >
                    {row.work_order.number} · {row.work_order.title}
                  </Link>
                ) : (
                  "Almacén"
                )}
                {" · "}
                {row.author?.full_name ?? "—"} · {formatDateTime(row.occurred_at)}
                {row.notes ? ` · ${row.notes}` : ""}
              </p>
              {voided && (
                <p className="text-xs text-destructive">
                  Anulada por {row.voider?.full_name ?? "—"} el {formatDateTime(row.voided_at)}:{" "}
                  {row.void_reason}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  voided && "line-through opacity-60",
                )}
              >
                {formatMoney(row.total_cost)}
              </span>
              {canVoid && !voided && !row.work_order_id && (
                <VoidUsageDialog
                  kind="waste"
                  recordId={row.id}
                  summary={`${quantity} de ${row.material.name}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
