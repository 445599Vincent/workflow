import type { NextRequest } from "next/server";

import { MOVEMENT_TYPES } from "@/features/inventory/labels";
import { listMovements } from "@/features/inventory/queries";
import { parseMovementListParams } from "@/features/inventory/schemas";
import { getCurrentUser } from "@/lib/auth/session";
import { csvDateTime, csvResponse, toCsv } from "@/lib/csv";
import { todayISODate } from "@/lib/format";

/** CSV of the movements list with the filters on screen (REP-07). */
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return new Response("No autenticado.", { status: 401 });

  const params = parseMovementListParams(Object.fromEntries(request.nextUrl.searchParams));
  const { rows } = await listMovements(params, { all: true });

  const csv = toCsv(
    [
      "Fecha",
      "Código",
      "Material",
      "Tipo",
      "Físico (±)",
      "Reservado (±)",
      "Unidad",
      "Existencia después",
      "Costo unitario",
      "Costo total",
      "Orden",
      "Referencia",
      "Notas",
      "Usuario",
      "Excepción de stock negativo",
    ],
    rows.map((row) => [
      csvDateTime(row.occurred_at),
      row.material_sku,
      row.material_name,
      row.movement_type ? MOVEMENT_TYPES[row.movement_type].label : "",
      row.on_hand_delta,
      row.reserved_delta,
      row.unit_symbol,
      row.on_hand_after,
      row.unit_cost,
      row.total_cost,
      row.work_order_number,
      row.reference,
      row.notes,
      row.created_by_name,
      row.negative_override,
    ]),
  );
  return csvResponse(csv, `movimientos-${todayISODate()}.csv`);
}
