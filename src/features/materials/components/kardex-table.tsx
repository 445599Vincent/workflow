import { HistoryIcon, ShieldAlertIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MOVEMENT_TYPES } from "@/features/inventory/labels";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import type { KardexRow } from "../queries";

type KardexTableProps = {
  rows: KardexRow[];
  unitSymbol: string;
  decimals: number;
};

/** Ledger of a material, newest first. Reservations affect "Reservado" only. */
export function KardexTable({ rows, unitSymbol, decimals }: KardexTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="Sin movimientos"
        description="Las entradas, consumos, mermas y ajustes de este material aparecerán aquí."
      />
    );
  }

  const qty = (value: number) => formatQuantity(value, decimals);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Fecha</TableHead>
          <TableHead>Movimiento</TableHead>
          <TableHead>Referencia</TableHead>
          <TableHead className="text-right">Entrada</TableHead>
          <TableHead className="text-right">Salida</TableHead>
          <TableHead className="text-right">Saldo ({unitSymbol})</TableHead>
          <TableHead className="text-right">Reservado</TableHead>
          <TableHead className="text-right">Costo unit.</TableHead>
          <TableHead>Usuario</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const type = MOVEMENT_TYPES[row.movement_type!];
          const onHandDelta = row.on_hand_delta ?? 0;
          const reservedDelta = row.reserved_delta ?? 0;
          return (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDateTime(row.occurred_at)}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <Badge variant={type.variant}>{type.label}</Badge>
                  {row.negative_override && (
                    <Tooltip>
                      <TooltipTrigger>
                        <ShieldAlertIcon
                          className="size-4 text-destructive"
                          aria-label="Stock negativo autorizado"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        Stock negativo autorizado por un administrador
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </TableCell>
              <TableCell className="max-w-64">
                <p className="truncate">
                  {row.work_order_number && (
                    <span className="font-mono text-xs">{row.work_order_number} · </span>
                  )}
                  {row.reference ?? "—"}
                </p>
                {row.notes && <p className="truncate text-xs text-muted-foreground">{row.notes}</p>}
              </TableCell>
              <TableCell className="text-right font-medium text-success tabular-nums">
                {onHandDelta > 0 ? `+${qty(onHandDelta)}` : ""}
              </TableCell>
              <TableCell className="text-right font-medium text-destructive tabular-nums">
                {onHandDelta < 0 ? `−${qty(Math.abs(onHandDelta))}` : ""}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {qty(row.on_hand_after ?? 0)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {qty(row.reserved_after ?? 0)}
                {reservedDelta !== 0 && (
                  <span className="ml-1 text-xs">
                    ({reservedDelta > 0 ? "+" : "−"}
                    {qty(Math.abs(reservedDelta))})
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.unit_cost === null ? "—" : formatMoney(row.unit_cost)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.created_by_name ?? "Sistema"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
