import { importTemplateHeaders } from "@/features/materials/import";
import { getCurrentUser } from "@/lib/auth/session";
import { csvResponse, toCsv } from "@/lib/csv";

/** Empty CSV with the import headers (MAT-01): one row per material below them. */
export async function GET() {
  if (!(await getCurrentUser())) return new Response("No autenticado.", { status: 401 });
  return csvResponse(toCsv(importTemplateHeaders(), []), "plantilla-materiales.csv");
}
