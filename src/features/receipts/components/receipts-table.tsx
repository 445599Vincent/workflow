import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatPlainDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReceiptListRow } from "../queries";
import { ReceiptStatusBadge } from "./receipt-status-badge";

export function ReceiptsTable({ rows }: { rows: ReceiptListRow[] }) {
  return (
    <>
      {/* Phones */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/receipts/${row.id}`} className="block px-4 py-3 active:bg-muted/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{row.number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatPlainDate(row.receipt_date)} · {row.supplier?.name ?? "Sin proveedor"}
                  </p>
                </div>
                <ReceiptStatusBadge voided={Boolean(row.voided_at)} />
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {row.lineCount} {row.lineCount === 1 ? "línea" : "líneas"}
                  {row.invoice_number && ` · Fact. ${row.invoice_number}`}
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    row.voided_at && "line-through opacity-60",
                  )}
                >
                  {formatMoney(row.total_cost)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="hidden lg:table-cell">Factura</TableHead>
              <TableHead className="text-right">Líneas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={cn(row.voided_at && "text-muted-foreground")}>
                <TableCell className="font-mono text-xs font-medium">
                  <Link href={`/receipts/${row.id}`} className="hover:text-primary hover:underline">
                    {row.number}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">{formatPlainDate(row.receipt_date)}</TableCell>
                <TableCell className="max-w-64 truncate">{row.supplier?.name ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">{row.invoice_number ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{row.lineCount}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    row.voided_at && "line-through",
                  )}
                >
                  {formatMoney(row.total_cost)}
                </TableCell>
                <TableCell>
                  <ReceiptStatusBadge voided={Boolean(row.voided_at)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
