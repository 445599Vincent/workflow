import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { MaterialImport } from "@/features/materials/components/material-import";
import { getImportCatalogs } from "@/features/materials/queries";
import { can, requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Importar materias primas" };

export default async function ImportMaterialsPage() {
  const user = await requirePermission("materials.manage");
  const catalogs = await getImportCatalogs();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/materials" className="hover:text-foreground">
            ← Materias primas
          </Link>
        }
        title="Importar materias primas"
        description="Carga del catálogo desde Excel (CSV), con existencia inicial y costo. Todo o nada."
      />
      <MaterialImport catalogs={catalogs} canCreateCatalogs={can(user, "catalog.manage")} />
    </div>
  );
}
