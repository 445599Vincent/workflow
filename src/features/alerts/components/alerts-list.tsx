import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ALERT_KINDS, alertHref } from "../labels";
import type { Alert } from "../queries";

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  return (
    <ul className="divide-y" data-testid="alerts-list">
      {alerts.map((alert) => {
        const kind = ALERT_KINDS[alert.kind];
        const Icon = kind.icon;
        return (
          <li key={`${alert.kind}-${alert.entity_id}-${alert.detail}`}>
            <Link
              href={alertHref(alert.kind, alert.entity_id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 sm:px-6"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  alert.critical
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/12 text-warning",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span className="font-mono text-xs text-muted-foreground">{alert.reference}</span>
                  <span className="truncate">{alert.title}</span>
                  {alert.critical && <Badge variant="destructive">Crítica</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {kind.label} · {alert.detail}
                </p>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
