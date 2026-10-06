import type { Metadata } from "next";
import Link from "next/link";
import { FileUpIcon, PackageIcon, PackageSearchIcon, PlusIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MaterialsFilters } from "@/features/materials/components/materials-filters";
import { MaterialsTable } from "@/features/materials/components/materials-table";
import { listCategoryOptions, listMaterials } from "@/features/materials/queries";
import { MATERIALS_PAGE_SIZE, parseMaterialListParams } from "@/features/materials/schemas";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Materias primas" };

export default async function MaterialsPage({ searchParams }: PageProps<"/materials">) {
  const user = await requireUser();
  const params = parseMaterialListParams(await searchParams);
  const [result, categories] = await Promise.all([listMaterials(params), listCategoryOptions()]);
  const canManage = can(user, "materials.manage");
  const isFiltered = params.q !== "" || Boolean(params.category) || params.status !== "active";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materias primas"
        description="Catálogo de materiales con su existencia física, reservada y disponible."
        actions={
          canManage && (
            <>
              <Button variant="outline" asChild>
                <Link href="/materials/import">
                  <FileUpIcon />
                  Importar
                </Link>
              </Button>
              <Button asChild>
                <Link href="/materials/new">
                  <PlusIcon />
                  Nuevo material
                </Link>
              </Button>
            </>
          )
        }
      />

      <MaterialsFilters categories={categories} />

      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={PackageSearchIcon}
              title="Ningún material coincide con los filtros"
              description="Pruebe con otro término de búsqueda o limpie los filtros."
            />
          ) : (
            <EmptyState
              icon={PackageIcon}
              title="Aún no hay materiales"
              description="Registre la materia prima que compra la empresa: vinil, lonas, acrílico, perfiles, tornillería…"
              action={
                canManage && (
                  <Button asChild>
                    <Link href="/materials/new">
                      <PlusIcon />
                      Crear el primer material
                    </Link>
                  </Button>
                )
              }
            />
          )
        ) : (
          <MaterialsTable rows={result.rows} params={params} />
        )}
      </Card>

      {result.total > 0 && (
        <Pagination
          pathname="/materials"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={MATERIALS_PAGE_SIZE}
          itemLabel="materiales"
        />
      )}
    </div>
  );
}
