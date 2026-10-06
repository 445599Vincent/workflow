import type { Database } from "@/types/database";

export type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];
export type WorkOrderPriority = Database["public"]["Enums"]["work_order_priority"];

type BadgeVariant = "muted" | "info" | "warning" | "success" | "destructive" | "secondary";

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, { label: string; variant: BadgeVariant }> =
  {
    draft: { label: "Borrador", variant: "muted" },
    pending: { label: "Pendiente", variant: "secondary" },
    planned: { label: "Planificada", variant: "info" },
    in_production: { label: "En producción", variant: "warning" },
    in_installation: { label: "En instalación", variant: "warning" },
    completed: { label: "Terminada", variant: "success" },
    cancelled: { label: "Cancelada", variant: "destructive" },
  };

export const WORK_ORDER_PRIORITY: Record<WorkOrderPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "pending",
  "planned",
  "in_production",
  "in_installation",
];
