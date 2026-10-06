import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchXIcon, TruckIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SuppliersFilters } from "@/features/suppliers/components/suppliers-filters";
import { SuppliersTable } from "@/features/suppliers/components/suppliers-table";
import { listSuppliers } from "@/features/suppliers/queries";
import { parseSupplierListParams, SUPPLIERS_PAGE_SIZE } from "@/features/suppliers/schemas";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const user = await requireUser();
  const params = parseSupplierListParams(await searchParams);
  const result = await listSuppliers(params);
  const canManage = can(user, "suppliers.manage");
  const isFiltered = params.q !== "" || params.status !== "active";

  const newButton = canManage && (
    <Button asChild>
      <Link href="/suppliers/new">
        <PlusIcon />
        Nuevo proveedor
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Empresas a las que se compra materia prima."
        actions={newButton}
      />

      <SuppliersFilters />

      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <SuppliersTable rows={result.rows} />
        ) : isFiltered ? (
          <EmptyState
            icon={SearchXIcon}
            title="Ningún proveedor coincide con los filtros"
            description="Pruebe con otro término de búsqueda o limpie los filtros."
          />
        ) : (
          <EmptyState
            icon={TruckIcon}
            title="Aún no hay proveedores"
            description="Registre a quién compra la empresa para asociarlo a las entradas de material."
            action={newButton}
          />
        )}
      </Card>

      {result.total > 0 && (
        <Pagination
          pathname="/suppliers"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={SUPPLIERS_PAGE_SIZE}
          itemLabel="proveedores"
        />
      )}
    </div>
  );
}
