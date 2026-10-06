/**
 * Estimated vs actual material cost of an order (CON-03, CON-04).
 * Shared by the server page and the completion dialog.
 */
export type CostSummary = {
  estimated: number;
  actual: number;
  waste: number;
  variance: number;
  /** Fraction (0.13 = 13 %); null when nothing was estimated. */
  variancePct: number | null;
  /** over: above the alert threshold · under: closed below the estimate (savings). */
  level: "over" | "under" | "ok" | "unestimated";
};

export function summarizeCosts({
  estimated,
  actual,
  waste,
  alertPct,
  closed,
}: {
  estimated: number;
  actual: number;
  waste: number;
  /** consumption_variance_alert_pct, in percent (10 = 10 %). */
  alertPct: number;
  /** An open order is naturally below its estimate: savings only count once closed. */
  closed: boolean;
}): CostSummary {
  const variance = actual - estimated;
  const variancePct = estimated > 0 ? variance / estimated : null;
  let level: CostSummary["level"] = "ok";
  if (variancePct === null) level = "unestimated";
  else if (variancePct * 100 > alertPct) level = "over";
  else if (variance < 0 && closed) level = "under";
  return { estimated, actual, waste, variance, variancePct, level };
}
