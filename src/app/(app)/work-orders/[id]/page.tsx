import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanIcon, CircleCheckBigIcon, PackageIcon, PencilIcon } from "lucide-react";
import { z } from "zod";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMaterialOptions } from "@/features/materials/queries";
import { AddMaterialDialog } from "@/features/work-orders/components/add-material-dialog";
import { CostFacts, costLevelMessage } from "@/features/work-orders/components/cost-summary";
import {
  CancelOrderDialog,
  ChangeStatusDialog,
  CompleteDialog,
  ReopenDialog,
} from "@/features/work-orders/components/status-actions";
import {
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/features/work-orders/components/status-badges";
import { WorkOrderLines } from "@/features/work-orders/components/work-order-lines";
import { UsageQuickActions } from "@/features/work-orders/components/usage-quick-actions";
import { UsageRecords } from "@/features/work-orders/components/usage-records";
import { WorkOrderTimeline } from "@/features/work-orders/components/work-order-timeline";
import { summarizeCosts } from "@/features/work-orders/costs";
import {
  acceptsConsumption,
  acceptsReservations,
  canComplete,
  isClosed,
  isOverdue,
  plainTransitions,
} from "@/features/work-orders/labels";
import {
  getVarianceAlertPct,
  getWorkOrder,
  getWorkOrderEvents,
  getWorkOrderLines,
  getWorkOrderUsage,
  getWorkOrderWasteCost,
} from "@/features/work-orders/queries";
import { can, requireUser } from "@/lib/auth/session";
import { formatDateTime, formatDuration, formatPlainDate, todayISODate } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/work-orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Orden de trabajo" };
  const order = await getWorkOrder(id);
  return { title: order?.number ?? "Orden de trabajo" };
}

export default async function WorkOrderPage({ params }: PageProps<"/work-orders/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  const [order, lines, events, usage, wasteCost, alertPct] = await Promise.all([
    getWorkOrder(id),
    getWorkOrderLines(id),
    getWorkOrderEvents(id),
    getWorkOrderUsage(id),
    getWorkOrderWasteCost(id),
    getVarianceAlertPct(),
  ]);
  if (!order) notFound();

  const closed = isClosed(order.status);
  const abilities = {
    manage: !closed && can(user, "work_orders.manage"),
    reserve: acceptsReservations(order.status) && can(user, "work_orders.reserve"),
    consume: acceptsConsumption(order.status) && can(user, "work_orders.consume"),
  };
  // Material options feed the add / unplanned-usage dialogs only.
  const materials = abilities.manage || abilities.consume ? await listMaterialOptions() : [];

  const summary = summarizeCosts({
    estimated: order.estimated_material_cost,
    actual: order.actual_material_cost,
    waste: wasteCost,
    alertPct,
    closed,
  });
  const costMessage = costLevelMessage(summary, alertPct);
  const orderRef = { id: order.id, number: order.number, status: order.status };
  const overdue = isOverdue(order.due_date, order.status, todayISODate());
  const transitions = plainTransitions(order.status);
  const units = Object.fromEntries(
    lines.map((line) => [
      line.material_id,
      { symbol: line.unitSymbol, decimals: line.unitDecimals },
    ]),
  );

  const details: [string, React.ReactNode][] = [
    [
      "Cliente",
      order.customer ? (
        <Link
          href={`/work-orders?customer=${order.customer.id}`}
          className="text-primary hover:underline"
        >
          {order.customer.name}
        </Link>
      ) : (
        "—"
      ),
    ],
    ["Responsable", order.responsible?.full_name ?? "—"],
    [
      "Fecha requerida",
      <span key="due" className={overdue ? "text-destructive" : undefined}>
        {formatPlainDate(order.due_date)}
        {overdue && " · atrasada"}
      </span>,
    ],
    ["Creada por", order.creator?.full_name ?? "—"],
    ["Creada el", formatDateTime(order.created_at)],
    ["Inicio de producción", formatDateTime(order.started_at)],
  ];
  if (order.completed_at) {
    details.push(["Terminada el", formatDateTime(order.completed_at)]);
    details.push(["Duración", formatDuration(order.started_at, order.completed_at)]);
  }

  const headerActions = (
    <>
      {abilities.manage && (
        <Button asChild variant="outline">
          <Link href={`/work-orders/${id}/edit`}>
            <PencilIcon />
            Editar
          </Link>
        </Button>
      )}
      {abilities.manage && transitions.length > 0 && (
        <ChangeStatusDialog key={order.status} order={orderRef} targets={transitions} />
      )}
      {abilities.manage && <CancelOrderDialog order={orderRef} />}
      {canComplete(order.status) && can(user, "work_orders.close") && (
        <CompleteDialog
          order={orderRef}
          summary={summary}
          usedLines={lines.filter((line) => line.usedQuantity > 0).length}
          responsible={order.responsible?.full_name ?? null}
          startedAt={order.started_at}
          reservedLines={lines.filter((line) => line.reserved_quantity > 0).length}
        />
      )}
      {closed && can(user, "work_orders.reopen") && <ReopenDialog order={orderRef} />}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/work-orders" className="hover:text-foreground">
            ← Órdenes de trabajo
          </Link>
        }
        title={`${order.number} · ${order.title}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <WorkOrderStatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
            {overdue && <Badge variant="destructive">Atrasada</Badge>}
          </span>
        }
        actions={headerActions}
      />

      {order.status === "cancelled" && (
        <Alert variant="destructive">
          <BanIcon />
          <AlertTitle>Orden cancelada</AlertTitle>
          <AlertDescription>
            <p>
              Cancelada el {formatDateTime(order.cancelled_at)}. Motivo: {order.cancel_reason}
            </p>
            <p>Las reservas se liberaron. Los consumos registrados se mantienen.</p>
          </AlertDescription>
        </Alert>
      )}
      {order.status === "completed" && (
        <Alert>
          <CircleCheckBigIcon />
          <AlertTitle>Orden terminada</AlertTitle>
          <AlertDescription>
            El costo real es definitivo y la orden ya no admite consumos ni mermas.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Costo de materiales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CostFacts summary={summary} />
              {costMessage && (
                <p
                  className={
                    summary.level === "over"
                      ? "text-sm text-destructive"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {costMessage}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 text-sm">
                {details.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {order.description && (
                <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-line text-muted-foreground">
                  {order.description}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="gap-0 pb-0">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
              <CardTitle>Materiales</CardTitle>
              <div className="flex flex-wrap gap-2">
                {abilities.consume && (
                  <UsageQuickActions workOrderId={id} lines={lines} materials={materials} />
                )}
                {abilities.manage && <AddMaterialDialog workOrderId={id} materials={materials} />}
              </div>
            </CardHeader>
            <CardContent className="border-t px-0">
              {lines.length === 0 ? (
                <EmptyState
                  icon={PackageIcon}
                  title="Sin materiales planificados"
                  description={
                    abilities.manage
                      ? "Agregue los materiales y cantidades estimadas para este trabajo."
                      : "Todavía no se han planificado materiales."
                  }
                />
              ) : (
                <WorkOrderLines
                  workOrderId={id}
                  lines={lines}
                  materials={materials}
                  abilities={abilities}
                />
              )}
              {!closed && !acceptsConsumption(order.status) && lines.length > 0 && (
                <p className="border-t px-6 py-3 text-xs text-muted-foreground">
                  Los consumos y mermas se registran cuando la orden está En producción o En
                  instalación.
                </p>
              )}
            </CardContent>
          </Card>

          {usage.length > 0 && (
            <Card className="gap-0 pb-0">
              <CardHeader className="pb-4">
                <CardTitle>Consumos y mermas</CardTitle>
                {closed && can(user, "inventory.void") && (
                  <CardDescription>
                    Para anular un registro, primero reabra la orden.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="border-t px-0">
                <UsageRecords
                  records={usage}
                  canVoid={acceptsConsumption(order.status) && can(user, "inventory.void")}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <WorkOrderTimeline events={events} units={units} />
          </Card>
        </div>
      </div>
    </div>
  );
}
