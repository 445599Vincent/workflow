"use client";

import Link from "next/link";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { buildHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import { REPORT_VIEWS, usesPeriod, type ReportParams, type ReportView } from "../schemas";

/** Report picker, period (REP-02) and CSV export with the same filters (REP-07). */
export function ReportControls({ params }: { params: ReportParams }) {
  const filters = useUrlFilters();
  const query = { view: params.view, from: params.from, to: params.to };

  return (
    <div className="space-y-4">
      <nav
        aria-label="Reportes"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {(Object.entries(REPORT_VIEWS) as [ReportView, string][]).map(([view, label]) => (
          <Link
            key={view}
            href={buildHref("/reports", query, { view })}
            aria-current={params.view === view ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              params.view === view
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {usesPeriod(params.view) ? (
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <Input
              type="date"
              aria-label="Desde"
              value={params.from}
              max={params.to}
              onChange={(event) =>
                event.target.value && filters.navigate({ from: event.target.value })
              }
              className="sm:w-40"
            />
            <Input
              type="date"
              aria-label="Hasta"
              value={params.to}
              min={params.from}
              onChange={(event) =>
                event.target.value && filters.navigate({ to: event.target.value })
              }
              className="sm:w-40"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Existencias y valor al momento de consultar.
          </p>
        )}
        <Button variant="outline" asChild>
          <a href={buildHref("/reports/export", query, {})} download>
            <DownloadIcon />
            Exportar CSV
          </a>
        </Button>
      </div>
    </div>
  );
}
