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
import { cn } from "@/lib/utils";
import type { ReportTable as ReportTableData } from "../definitions";

/** Generic report grid; secondary columns hide on small screens (they stay in the CSV). */
export function ReportTable({ table }: { table: ReportTableData }) {
  const cellClass = (index: number) => {
    const column = table.columns[index];
    return cn(
      column?.numeric && "text-right tabular-nums",
      column?.secondary && "hidden lg:table-cell",
    );
  };

  // "Total" goes in the first column that is visible on phones.
  const labelIndex = Math.max(
    0,
    table.columns.findIndex((column) => !column.secondary),
  );

  return (
    <Table data-testid="report-table">
      <TableHeader>
        <TableRow>
          {table.columns.map((column, index) => (
            <TableHead key={column.header} className={cellClass(index)}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {row.map((cell, index) => (
              <TableCell key={index} className={cn(cellClass(index), index === 0 && "font-medium")}>
                {cell.href ? (
                  <Link href={cell.href} className="hover:text-primary hover:underline">
                    {cell.text}
                  </Link>
                ) : (
                  cell.text
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {table.totals && (
        <TableFooter>
          <TableRow>
            {table.totals.map((total, index) => (
              <TableCell key={index} className={cn(cellClass(index), "font-semibold")}>
                {index === labelIndex ? "Total" : (total ?? "")}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
