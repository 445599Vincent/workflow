import { IMPORT_TEMPLATE } from "@/features/materials/import";
import { getCurrentUser } from "@/lib/auth/session";
import { csvResponse } from "@/lib/csv";

/** Template for the material import (IMP-01), UTF-8 with BOM for Excel. */
export async function GET() {
  if (!(await getCurrentUser())) return new Response("No autenticado.", { status: 401 });
  return csvResponse(`﻿${IMPORT_TEMPLATE}\r\n`, "plantilla-materias-primas.csv");
}
