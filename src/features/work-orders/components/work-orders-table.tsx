import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatPlainDate, todayISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isOverdue } from "../labels";
import type { WorkOrderListRow } from "../queries";
import { PriorityBadge, WorkOrderStatusBadge } from "./status-badges";

function DueDate({ row, today }: { row: WorkOrderListRow; today: string }) {
  const overdue = isOverdue(row.due_date, row.status, today);
  return (
    <span
      className={cn(
        "tabular-nums",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {overdue && "Atrasada · "}
      {formatPlainDate(row.due_date)}
    </span>
  );
}

export function WorkOrdersTable({ rows }: { rows: WorkOrderListRow[] }) {
  const today = todayISODate();

  return (
    <>
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/work-orders/${row.id}`} className="block px-4 py-3 active:bg-muted/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{row.number}</p>
                  <p className="truncate font-medium">{row.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.customer?.name ?? "Sin cliente"}
                  </p>
                </div>
                <WorkOrderStatusBadge status={row.status} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <DueDate row={row} today={today} />
                <span className="tabular-nums">{formatMoney(row.actual_material_cost)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Prioridad</TableHead>
              <TableHead>Fecha requerida</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Estimado</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Real</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-80">
                  <Link href={`/work-orders/${row.id}`} className="group block">
                    <span className="font-mono text-xs text-muted-foreground">{row.number}</span>
                    <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                      {row.title}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {row.customer?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <WorkOrderStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <PriorityBadge priority={row.priority} />
                </TableCell>
                <TableCell>
                  <DueDate row={row} today={today} />
                </TableCell>
                <TableCell className="hidden text-right tabular-nums xl:table-cell">
                  {formatMoney(row.estimated_material_cost)}
                </TableCell>
                <TableCell className="hidden text-right font-medium tabular-nums xl:table-cell">
                  {formatMoney(row.actual_material_cost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
