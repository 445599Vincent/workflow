import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { MOVEMENT_TYPES } from "../labels";
import type { MovementRow } from "../queries";
import { MovementQuantity } from "./movement-quantity";

function Reference({ row }: { row: MovementRow }) {
  return (
    <>
      <p className="truncate">
        {row.work_order_number && (
          <span className="font-mono text-xs">{row.work_order_number} · </span>
        )}
        {row.reference ?? "—"}
      </p>
      {row.notes && (
        <p className="truncate text-xs text-muted-foreground" title={row.notes}>
          {row.notes}
        </p>
      )}
    </>
  );
}

export function MovementsTable({ rows }: { rows: MovementRow[] }) {
  return (
    <>
      {/* Phones */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => {
          const type = MOVEMENT_TYPES[row.movement_type!];
          return (
            <li key={row.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/materials/${row.material_id}`}
                    title={row.material_name ?? undefined}
                    className="block truncate font-medium hover:text-primary"
                  >
                    {row.material_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(row.occurred_at)} · {row.created_by_name ?? "Sistema"}
                  </p>
                </div>
                <Badge variant={type.variant}>{type.label}</Badge>
              </div>
              <div className="mt-1 flex items-end justify-between gap-3 text-sm">
                <div className="min-w-0 text-muted-foreground">
                  <Reference row={row} />
                </div>
                <MovementQuantity
                  onHandDelta={row.on_hand_delta ?? 0}
                  reservedDelta={row.reserved_delta ?? 0}
                  unitSymbol={row.unit_symbol}
                  decimals={row.unit_decimals ?? 4}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tablet and desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Fecha</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead className="hidden lg:table-cell">Referencia</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Saldo</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Valor</TableHead>
              <TableHead className="hidden 2xl:table-cell">Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const type = MOVEMENT_TYPES[row.movement_type!];
              return (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(row.occurred_at)}
                  </TableCell>
                  <TableCell className="max-w-56">
                    <Link
                      href={`/materials/${row.material_id}`}
                      title={row.material_name ?? undefined}
                      className="block truncate font-medium hover:text-primary hover:underline"
                    >
                      {row.material_name}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.material_sku}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Badge variant={type.variant}>{type.label}</Badge>
                      {row.negative_override && (
                        <ShieldAlertIcon
                          className="size-4 text-destructive"
                          aria-label="Stock negativo autorizado"
                        />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-60 lg:table-cell">
                    <Reference row={row} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MovementQuantity
                      onHandDelta={row.on_hand_delta ?? 0}
                      reservedDelta={row.reserved_delta ?? 0}
                      unitSymbol={row.unit_symbol}
                      decimals={row.unit_decimals ?? 4}
                    />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums xl:table-cell">
                    {formatQuantity(row.on_hand_after ?? 0, row.unit_decimals ?? 4)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums xl:table-cell">
                    {row.total_cost === null ? "—" : formatMoney(row.total_cost)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground 2xl:table-cell">
                    {row.created_by_name ?? "Sistema"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
