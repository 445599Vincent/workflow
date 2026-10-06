import type { NextRequest } from "next/server";

import { listWaste } from "@/features/inventory/queries";
import { parseWasteListParams } from "@/features/inventory/schemas";
import { WASTE_REASONS } from "@/features/work-orders/labels";
import { getCurrentUser } from "@/lib/auth/session";
import { csvDateTime, csvResponse, toCsv } from "@/lib/csv";
import { todayISODate } from "@/lib/format";

/** CSV of the waste list with the filters on screen (REP-07). */
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return new Response("No autenticado.", { status: 401 });

  const params = parseWasteListParams(Object.fromEntries(request.nextUrl.searchParams));
  const { rows } = await listWaste(params, { all: true });

  const csv = toCsv(
    [
      "Fecha",
      "Código",
      "Material",
      "Cantidad",
      "Unidad",
      "Motivo",
      "Costo",
      "Origen",
      "Trabajo",
      "Notas",
      "Registrada por",
      "Anulada",
      "Motivo de anulación",
    ],
    rows.map((row) => [
      csvDateTime(row.occurred_at),
      row.material.sku,
      row.material.name,
      row.quantity,
      row.material.unit.symbol,
      WASTE_REASONS[row.reason],
      row.total_cost,
      row.work_order?.number ?? "Almacén",
      row.work_order?.title,
      row.notes,
      row.author?.full_name,
      Boolean(row.voided_at),
      row.void_reason,
    ]),
  );
  return csvResponse(csv, `mermas-${todayISODate()}.csv`);
}
