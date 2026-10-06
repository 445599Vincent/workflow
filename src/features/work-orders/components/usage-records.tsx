import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney, formatQuantityWithUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WASTE_REASONS } from "../labels";
import type { WorkOrderUsage } from "../queries";
import { VoidUsageDialog } from "./void-usage-dialog";

/** Every consumption and waste of the order, voided ones included (CON-05). */
export function UsageRecords({
  records,
  canVoid,
}: {
  records: WorkOrderUsage[];
  canVoid: boolean;
}) {
  return (
    <ul className="divide-y" data-testid="usage-records">
      {records.map((record) => {
        const voided = Boolean(record.voided_at);
        const quantity = formatQuantityWithUnit(
          record.quantity,
          record.material.unit.symbol,
          record.material.unit.decimals,
        );
        return (
          <li
            key={`${record.kind}-${record.id}`}
            className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 sm:px-6"
          >
            <div className={cn("min-w-0 flex-1 space-y-0.5 text-sm", voided && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={record.kind === "waste" ? "warning" : "secondary"}>
                  {record.kind === "waste" ? "Merma" : "Consumo"}
                </Badge>
                <span className={cn("font-medium", voided && "line-through")}>
                  {quantity} · {record.material.name}
                </span>
                {voided && <Badge variant="destructive">Anulado</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {record.reason ? `${WASTE_REASONS[record.reason]} · ` : ""}
                {record.author?.full_name ?? "—"} · {formatDateTime(record.created_at)}
                {record.notes ? ` · ${record.notes}` : ""}
              </p>
              {voided && (
                <p className="text-xs text-destructive">
                  Anulado por {record.voider?.full_name ?? "—"} el{" "}
                  {formatDateTime(record.voided_at)}: {record.void_reason}
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
                {formatMoney(record.total_cost)}
              </span>
              {canVoid && !voided && (
                <VoidUsageDialog
                  kind={record.kind}
                  recordId={record.id}
                  summary={`${quantity} de ${record.material.name}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
