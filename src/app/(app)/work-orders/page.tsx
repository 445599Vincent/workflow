import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardListIcon, PlusIcon, SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listCustomerOptions } from "@/features/customers/queries";
import { WorkOrdersFilters } from "@/features/work-orders/components/work-orders-filters";
import { WorkOrdersTable } from "@/features/work-orders/components/work-orders-table";
import { listWorkOrders } from "@/features/work-orders/queries";
import { parseWorkOrderListParams, WORK_ORDERS_PAGE_SIZE } from "@/features/work-orders/schemas";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Órdenes de trabajo" };

export default async function WorkOrdersPage({ searchParams }: PageProps<"/work-orders">) {
  const user = await requireUser();
  const params = parseWorkOrderListParams(await searchParams);
  const [result, customers] = await Promise.all([listWorkOrders(params), listCustomerOptions()]);
  const isFiltered = params.q !== "" || params.status !== "open" || Boolean(params.customer);

  const newButton = can(user, "work_orders.manage") && (
    <Button asChild>
      <Link href="/work-orders/new">
        <PlusIcon />
        Nueva orden
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de trabajo"
        description="Cada trabajo con sus materiales planificados, reservados y consumidos, y su costo real."
        actions={newButton}
      />
      <WorkOrdersFilters customers={customers.filter((item) => item.is_active)} />
      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <WorkOrdersTable rows={result.rows} />
        ) : isFiltered ? (
          <EmptyState icon={SearchXIcon} title="Ninguna orden coincide con los filtros" />
        ) : (
          <EmptyState
            icon={ClipboardListIcon}
            title="No hay órdenes abiertas"
            description="Cree una orden por cada trabajo para controlar el material que consume."
            action={newButton}
          />
        )}
      </Card>
      {result.total > 0 && (
        <Pagination
          pathname="/work-orders"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={WORK_ORDERS_PAGE_SIZE}
          itemLabel="órdenes"
        />
      )}
    </div>
  );
}
