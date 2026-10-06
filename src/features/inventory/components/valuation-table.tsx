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
import { formatMoney, formatPercent } from "@/lib/format";

type Category = { id: string | null; name: string; materials: number; value: number };

/** Inventory value by category with its share of the total (REP-06). */
export function ValuationTable({ categories, total }: { categories: Category[]; total: number }) {
  return (
    <Table data-testid="valuation-table">
      <TableHeader>
        <TableRow>
          <TableHead>Categoría</TableHead>
          <TableHead className="text-right">Materiales</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="hidden text-right sm:table-cell">% del total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => {
          const share = total > 0 ? category.value / total : 0;
          return (
            <TableRow key={category.id ?? "none"}>
              <TableCell className="font-medium">
                {category.id ? (
                  <Link
                    href={`/materials?category=${category.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                ) : (
                  category.name
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{category.materials}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(category.value)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm tabular-nums">
                    {formatPercent(share)}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Total</TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {categories.reduce((acc, category) => acc + category.materials, 0)}
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {formatMoney(total)}
          </TableCell>
          <TableCell className="hidden sm:table-cell" />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
