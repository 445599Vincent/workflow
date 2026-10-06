import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CostSummary } from "../costs";

const VARIANCE_TONE: Record<CostSummary["level"], string> = {
  over: "text-destructive",
  under: "text-success",
  ok: "text-foreground",
  unestimated: "text-muted-foreground",
};

function signedMoney(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatMoney(Math.abs(value))}`;
}

/** Estimated vs actual cost, variance and waste (CIE-01). */
export function CostFacts({ summary, className }: { summary: CostSummary; className?: string }) {
  const facts: [string, React.ReactNode, string?][] = [
    ["Costo estimado", formatMoney(summary.estimated)],
    ["Costo real", formatMoney(summary.actual)],
    [
      "Variación",
      <>
        {signedMoney(summary.variance)}
        {summary.variancePct !== null && (
          <span className="ml-1 text-xs font-medium">
            ({summary.variancePct > 0 ? "+" : ""}
            {formatPercent(summary.variancePct)})
          </span>
        )}
      </>,
      VARIANCE_TONE[summary.level],
    ],
    ["Incluye merma", formatMoney(summary.waste), summary.waste > 0 ? "text-warning" : undefined],
  ];

  return (
    <dl className={cn("grid grid-cols-2 gap-3 text-sm", className)} data-testid="cost-summary">
      {facts.map(([label, value, tone]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className={cn("text-base font-semibold tabular-nums", tone)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function costLevelMessage(summary: CostSummary, alertPct: number): string | null {
  switch (summary.level) {
    case "over":
      return `El costo real supera el estimado en más de ${alertPct} %.`;
    case "under":
      return "La orden terminó por debajo del costo estimado.";
    case "unestimated":
      return summary.actual > 0 ? "La orden no tiene costo estimado para comparar." : null;
    default:
      return null;
  }
}
