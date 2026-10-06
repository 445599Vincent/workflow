import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/features/work-orders/components/work-order-form";
import { getWorkOrderFormOptions } from "@/features/work-orders/queries";
import { requirePermission } from "@/lib/auth/session";
import { firstParam } from "@/lib/url";

export const metadata: Metadata = { title: "Nueva orden" };

export default async function NewWorkOrderPage({ searchParams }: PageProps<"/work-orders/new">) {
  const user = await requirePermission("work_orders.manage");
  const params = await searchParams;
  const options = await getWorkOrderFormOptions();
  const customerId = firstParam(params.customer);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/work-orders" className="hover:text-foreground">
            ← Órdenes de trabajo
          </Link>
        }
        title="Nueva orden de trabajo"
        description="Después de crearla podrá agregar los materiales planificados."
      />
      <WorkOrderForm
        mode="create"
        options={options}
        defaultValues={{
          title: "",
          customerId: options.customers.some((item) => item.id === customerId)
            ? (customerId ?? "")
            : "",
          description: "",
          priority: "normal",
          dueDate: "",
          responsibleId: user.id,
          initialStatus: "pending",
        }}
      />
    </div>
  );
}
