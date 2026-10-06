import { formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Signed quantity of a ledger row: physical changes in green/red; reservation
 * movements only change the reserved stock, shown in blue with a label.
 */
export function MovementQuantity({
  onHandDelta,
  reservedDelta,
  unitSymbol,
  decimals,
}: {
  onHandDelta: number;
  reservedDelta: number;
  unitSymbol: string | null;
  decimals: number;
}) {
  if (onHandDelta !== 0) {
    return (
      <span
        className={cn(
          "font-medium tabular-nums",
          onHandDelta > 0 ? "text-success" : "text-destructive",
        )}
      >
        {onHandDelta > 0 ? "+" : "−"}
        {formatQuantity(Math.abs(onHandDelta), decimals)} {unitSymbol}
      </span>
    );
  }
  return (
    <span className="font-medium text-primary tabular-nums">
      {reservedDelta > 0 ? "+" : "−"}
      {formatQuantity(Math.abs(reservedDelta), decimals)} {unitSymbol}
      <span className="ml-1 text-xs font-normal">(reservado)</span>
    </span>
  );
}
