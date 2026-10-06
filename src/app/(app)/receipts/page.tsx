import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlusIcon, PlusIcon, SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReceiptsFilters } from "@/features/receipts/components/receipts-filters";
import { ReceiptsTable } from "@/features/receipts/components/receipts-table";
import { listReceipts } from "@/features/receipts/queries";
import { parseReceiptListParams, RECEIPTS_PAGE_SIZE } from "@/features/receipts/schemas";
import { listSupplierOptions } from "@/features/suppliers/queries";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Compras / Entradas" };

export default async function ReceiptsPage({ searchParams }: PageProps<"/receipts">) {
  const user = await requireUser();
  const params = parseReceiptListParams(await searchParams);
  const [result, suppliers] = await Promise.all([listReceipts(params), listSupplierOptions()]);
  const isFiltered =
    params.q !== "" ||
    Boolean(params.supplier || params.from || params.to) ||
    params.status !== "all";

  const newButton = can(user, "inventory.receive") && (
    <Button asChild>
      <Link href="/receipts/new">
        <PlusIcon />
        Nueva entrada
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras / Entradas"
        description="Material recibido en el almacén. Cada entrada aumenta el inventario y actualiza el costo promedio."
        actions={newButton}
      />

      <ReceiptsFilters suppliers={suppliers} />

      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <ReceiptsTable rows={result.rows} />
        ) : isFiltered ? (
          <EmptyState
            icon={SearchXIcon}
            title="Ninguna entrada coincide con los filtros"
            description="Pruebe con otro período, proveedor o término de búsqueda."
          />
        ) : (
          <EmptyState
            icon={PackagePlusIcon}
            title="Aún no hay entradas registradas"
            description="Registre aquí cada compra o recepción de material."
            action={newButton}
          />
        )}
      </Card>

      {result.total > 0 && (
        <Pagination
          pathname="/receipts"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={RECEIPTS_PAGE_SIZE}
          itemLabel="entradas"
        />
      )}
    </div>
  );
}
