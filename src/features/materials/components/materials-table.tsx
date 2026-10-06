import Link from "next/link";

import { SortableHeader } from "@/components/shared/sortable-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatQuantity, formatQuantityWithUnit } from "@/lib/format";
import type { SearchParamValue } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { MaterialListRow } from "../queries";
import type { MaterialListParams } from "../schemas";
import { StockStatusBadge } from "./stock-status-badge";

type MaterialsTableProps = {
  rows: MaterialListRow[];
  params: MaterialListParams;
};

const PATHNAME = "/materials";

function decimalsOf(row: MaterialListRow) {
  return row.unit_decimals ?? 4;
}

export function MaterialsTable({ rows, params }: MaterialsTableProps) {
  const urlParams: Record<string, SearchParamValue> = { ...params };
  const sortProps = {
    pathname: PATHNAME,
    params: urlParams,
    currentSort: params.sort,
    currentDir: params.dir,
  };

  return (
    <>
      {/* Phones: one card per material */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/materials/${row.id}`} className="block px-4 py-3 active:bg-muted/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.sku} · {row.category_name}
                  </p>
                </div>
                <StockStatusBadge status={row.stock_status} />
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Físico</dt>
                  <dd className="font-medium tabular-nums">
                    {formatQuantity(row.stock_on_hand, decimalsOf(row))}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reservado</dt>
                  <dd className="font-medium tabular-nums">
                    {formatQuantity(row.stock_reserved, decimalsOf(row))}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Disponible</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatQuantityWithUnit(row.stock_available, row.unit_symbol, decimalsOf(row))}
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHeader label="Código" field="sku" {...sortProps} />
              <SortableHeader label="Material" field="name" {...sortProps} />
              <SortableHeader
                label="Categoría"
                field="category_name"
                {...sortProps}
                className="hidden xl:table-cell"
              />
              <SortableHeader label="Físico" field="stock_on_hand" align="right" {...sortProps} />
              <TableHead className="text-right">Reservado</TableHead>
              <SortableHeader
                label="Disponible"
                field="stock_available"
                align="right"
                {...sortProps}
              />
              <TableHead className="hidden text-right 2xl:table-cell">Mínimo</TableHead>
              <SortableHeader
                label="Costo prom."
                field="avg_cost"
                align="right"
                {...sortProps}
                className="hidden 2xl:table-cell"
              />
              <SortableHeader
                label="Valor"
                field="inventory_value"
                align="right"
                {...sortProps}
                className="hidden xl:table-cell"
              />
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
                <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                <TableCell className="max-w-44 truncate font-medium xl:max-w-64">
                  <Link
                    href={`/materials/${row.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">
                  {row.category_name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(row.stock_on_hand, decimalsOf(row))}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatQuantity(row.stock_reserved, decimalsOf(row))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatQuantity(row.stock_available, decimalsOf(row))}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {row.unit_symbol}
                  </span>
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground tabular-nums 2xl:table-cell">
                  {formatQuantity(row.min_stock, decimalsOf(row))}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums 2xl:table-cell">
                  {formatMoney(row.avg_cost)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums xl:table-cell">
                  {formatMoney(row.inventory_value)}
                </TableCell>
                <TableCell>
                  <StockStatusBadge status={row.stock_status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
