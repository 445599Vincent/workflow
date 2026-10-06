import type { Metadata } from "next";
import { BuildingIcon, PlusIcon, SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerDialog } from "@/features/customers/components/customer-dialog";
import { CustomersFilters } from "@/features/customers/components/customers-filters";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { listCustomers } from "@/features/customers/queries";
import { CUSTOMERS_PAGE_SIZE, parseCustomerListParams } from "@/features/customers/schemas";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const user = await requireUser();
  const params = parseCustomerListParams(await searchParams);
  const result = await listCustomers(params);
  const canManage = can(user, "customers.manage");
  const isFiltered = params.q !== "" || params.status !== "active";

  const newButton = canManage && (
    <CustomerDialog
      trigger={
        <Button>
          <PlusIcon />
          Nuevo cliente
        </Button>
      }
    />
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Clientes"
        description="Para quién se hacen los trabajos. Se usan en las órdenes y en los reportes de consumo por cliente."
        actions={newButton}
      />
      <CustomersFilters />
      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <CustomersTable rows={result.rows} canManage={canManage} />
        ) : isFiltered ? (
          <EmptyState icon={SearchXIcon} title="Ningún cliente coincide con los filtros" />
        ) : (
          <EmptyState
            icon={BuildingIcon}
            title="Aún no hay clientes"
            description="Registre los clientes para asociarlos a las órdenes de trabajo."
            action={newButton}
          />
        )}
      </Card>
      {result.total > 0 && (
        <Pagination
          pathname="/customers"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={CUSTOMERS_PAGE_SIZE}
          itemLabel="clientes"
        />
      )}
    </div>
  );
}
