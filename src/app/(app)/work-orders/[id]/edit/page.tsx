import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/features/work-orders/components/work-order-form";
import { isClosed } from "@/features/work-orders/labels";
import { getWorkOrder, getWorkOrderFormOptions } from "@/features/work-orders/queries";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Editar orden" };

export default async function EditWorkOrderPage({ params }: PageProps<"/work-orders/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  await requirePermission("work_orders.manage");
  const [order, options] = await Promise.all([getWorkOrder(id), getWorkOrderFormOptions()]);
  if (!order) notFound();
  if (isClosed(order.status)) redirect(`/work-orders/${id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/work-orders/${id}`} className="hover:text-foreground">
            ← {order.number}
          </Link>
        }
        title="Editar orden"
        description="El estado se cambia desde la página de la orden."
      />
      <WorkOrderForm
        mode="edit"
        workOrderId={id}
        options={options}
        defaultValues={{
          title: order.title,
          customerId: order.customer_id ?? "",
          description: order.description ?? "",
          priority: order.priority,
          dueDate: order.due_date ?? "",
          responsibleId: order.responsible_id ?? "",
          initialStatus: "pending",
        }}
      />
    </div>
  );
}
