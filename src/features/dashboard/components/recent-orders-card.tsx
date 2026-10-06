import { ClipboardListIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OPEN_WORK_ORDER_STATUSES, WORK_ORDER_STATUS } from "@/features/work-orders/labels";
import { formatPlainDate, todayISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { getRecentWorkOrders } from "../queries";

type Orders = Awaited<ReturnType<typeof getRecentWorkOrders>>;

export function RecentOrdersCard({ orders }: { orders: Orders }) {
  const today = todayISODate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Órdenes recientes</CardTitle>
        <CardDescription>Últimas órdenes de trabajo creadas</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {orders.length === 0 ? (
          <EmptyState
            icon={ClipboardListIcon}
            title="Aún no hay órdenes"
            description="Las órdenes de trabajo aparecerán aquí cuando se registren."
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {orders.map((order) => {
              const status = WORK_ORDER_STATUS[order.status];
              const overdue =
                Boolean(order.due_date) &&
                order.due_date! < today &&
                OPEN_WORK_ORDER_STATUSES.includes(order.status);
              return (
                <li key={order.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <span className="font-mono text-xs text-muted-foreground">
                        {order.number}
                      </span>{" "}
                      {order.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.customer?.name ?? "Sin cliente"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {overdue ? "Atrasada · " : ""}
                      {formatPlainDate(order.due_date)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
