import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthlyTrend } from "../queries";

const monthFormatter = new Intl.DateTimeFormat("es-DO", { month: "short", timeZone: "UTC" });

/** "2026-10-01" → "oct" (dates without time must not shift with the time zone). */
function monthLabel(month: string) {
  return monthFormatter.format(new Date(`${month}T12:00:00Z`)).replace(".", "");
}

const compact = new Intl.NumberFormat("es-DO", { notation: "compact", maximumFractionDigits: 1 });

function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** Bars are decorative; the sr-only table carries the same numbers (D-032). */
function Bars({
  rows,
  series,
  caption,
  stacked,
  footer,
}: {
  rows: MonthlyTrend;
  series: { label: string; className: string; value: (row: MonthlyTrend[number]) => number }[];
  caption: string;
  stacked: boolean;
  footer?: (row: MonthlyTrend[number]) => string;
}) {
  const totals = rows.map((row) => series.map((item) => item.value(row)));
  const max = Math.max(
    1,
    ...totals.map((values) => (stacked ? values.reduce((a, b) => a + b, 0) : Math.max(...values))),
  );

  return (
    <>
      <div className="flex h-44 items-end gap-2 sm:gap-3" aria-hidden>
        {rows.map((row, index) => {
          const values = totals[index] ?? [];
          const top = stacked ? values.reduce((a, b) => a + b, 0) : Math.max(...values);
          return (
            <div key={row.month} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {top > 0 ? compact.format(top) : ""}
              </span>
              <div
                className={cn(
                  "flex w-full max-w-12 flex-1 items-end",
                  stacked ? "flex-col-reverse justify-start" : "gap-1",
                )}
              >
                {series.map((item, seriesIndex) => {
                  const value = values[seriesIndex] ?? 0;
                  return (
                    <div
                      key={item.label}
                      title={`${item.label}: ${formatMoney(value)}`}
                      className={cn(
                        item.className,
                        stacked
                          ? "w-full first:rounded-b-sm last:rounded-t-sm"
                          : "flex-1 rounded-t-sm",
                      )}
                      style={{ height: `${(value / max) * 100}%` }}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {monthLabel(row.month)}
              </span>
              {footer && <span className="text-[11px] text-muted-foreground">{footer(row)}</span>}
            </div>
          );
        })}
      </div>
      {/* sr-only on a wrapper: a table ignores the 1px width and would overflow. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Mes</th>
              {series.map((item) => (
                <th key={item.label}>{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <td>{monthLabel(row.month)}</td>
                {series.map((item) => (
                  <td key={item.label}>{formatMoney(item.value(row))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function TrendCharts({ trend }: { trend: MonthlyTrend }) {
  const usage = [
    {
      label: "Consumo",
      className: "bg-success",
      value: (row: MonthlyTrend[number]) => row.consumed_cost,
    },
    {
      label: "Merma",
      className: "bg-warning",
      value: (row: MonthlyTrend[number]) => row.waste_cost,
    },
  ];
  const orders = [
    {
      label: "Estimado",
      className: "bg-primary/30",
      value: (row: MonthlyTrend[number]) => row.estimated_cost,
    },
    {
      label: "Real",
      className: "bg-primary",
      value: (row: MonthlyTrend[number]) => row.actual_cost,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0" data-testid="trend-charts">
      <Card>
        <CardHeader>
          <CardTitle>Consumo y merma por mes</CardTitle>
          <CardDescription>Costo de material usado en los últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Legend items={usage} />
          <Bars rows={trend} series={usage} stacked caption="Consumo y merma por mes (RD$)" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Órdenes terminadas: estimado vs real</CardTitle>
          <CardDescription>Costo de materiales de las órdenes cerradas cada mes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Legend items={orders} />
          <Bars
            rows={trend}
            series={orders}
            stacked={false}
            caption="Órdenes terminadas por mes: costo estimado y real (RD$)"
            footer={(row) => `${row.completed_orders} OT`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
