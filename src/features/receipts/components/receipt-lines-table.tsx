import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatQuantityWithUnit } from "@/lib/format";
import type { ReceiptLine } from "../queries";

export function ReceiptLinesTable({ lines, total }: { lines: ReceiptLine[]; total: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10">#</TableHead>
          <TableHead>Material</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Costo unitario</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell className="text-muted-foreground tabular-nums">{line.line_no}</TableCell>
            <TableCell className="max-w-80">
              <Link
                href={`/materials/${line.material.id}`}
                title={line.material.name}
                className="block truncate font-medium hover:text-primary hover:underline"
              >
                {line.material.name}
              </Link>
              <span className="font-mono text-xs text-muted-foreground">{line.material.sku}</span>
              {line.notes && (
                <span className="block text-xs text-muted-foreground">{line.notes}</span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatQuantityWithUnit(line.quantity, line.unit.symbol, line.unit.decimals)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(line.unit_cost)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatMoney(line.line_total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="text-right">
            Total
          </TableCell>
          <TableCell className="text-right text-base font-semibold tabular-nums">
            {formatMoney(total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
