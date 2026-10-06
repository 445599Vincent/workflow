import { StatCard } from "@/components/shared/stat-card";
import { ALERT_KINDS, ALERT_ORDER, type AlertKind } from "../labels";

/** One card per alert type with its count; links to the alert list. */
export function AlertsSummary({ counts }: { counts: Record<AlertKind, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="alerts-summary">
      {ALERT_ORDER.map((kind) => (
        <StatCard
          key={kind}
          label={ALERT_KINDS[kind].label}
          value={counts[kind]}
          icon={ALERT_KINDS[kind].icon}
          tone={
            counts[kind] > 0
              ? kind === "low_stock" || kind === "overdue"
                ? "danger"
                : "warning"
              : "success"
          }
          href={`/alerts?kind=${kind}`}
        />
      ))}
    </div>
  );
}
