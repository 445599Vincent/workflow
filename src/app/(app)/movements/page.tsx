import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRightIcon, PackagePlusIcon, ScaleIcon, SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MovementsFilters } from "@/features/inventory/components/movements-filters";
import { MovementsTable } from "@/features/inventory/components/movements-table";
import { listMovements } from "@/features/inventory/queries";
import { MOVEMENTS_PAGE_SIZE, parseMovementListParams } from "@/features/inventory/schemas";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovementsPage({ searchParams }: PageProps<"/movements">) {
  const user = await requireUser();
  const params = parseMovementListParams(await searchParams);
  const result = await listMovements(params);
  const isFiltered = params.q !== "" || Boolean(params.type || params.from || params.to);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Todos los cambios de inventario, del más reciente al más antiguo. Ningún movimiento se borra."
        actions={
          <>
            {can(user, "inventory.receive") && (
              <Button variant="outline" asChild>
                <Link href="/receipts/new">
                  <PackagePlusIcon />
                  Nueva entrada
                </Link>
              </Button>
            )}
            {can(user, "inventory.adjust") && (
              <Button asChild>
                <Link href="/movements/adjust">
                  <ScaleIcon />
                  Nuevo ajuste
                </Link>
              </Button>
            )}
          </>
        }
      />

      <MovementsFilters />

      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <MovementsTable rows={result.rows} />
        ) : isFiltered ? (
          <EmptyState
            icon={SearchXIcon}
            title="Ningún movimiento coincide con los filtros"
            description="Pruebe con otro período, tipo o término de búsqueda."
          />
        ) : (
          <EmptyState
            icon={ArrowLeftRightIcon}
            title="Aún no hay movimientos"
            description="Las entradas, ajustes, consumos y mermas aparecerán aquí."
          />
        )}
      </Card>

      {result.total > 0 && (
        <Pagination
          pathname="/movements"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={MOVEMENTS_PAGE_SIZE}
          itemLabel="movimientos"
        />
      )}
    </div>
  );
}
