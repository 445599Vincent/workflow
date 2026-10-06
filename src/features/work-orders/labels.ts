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

export type WasteReason = Database["public"]["Enums"]["waste_reason"];

export const WASTE_REASONS: Record<WasteReason, string> = {
  print_error: "Error de impresión",
  cutting: "Corte",
  damage: "Daño",
  test: "Prueba",
  installation: "Instalación",
  defect: "Defecto",
  other: "Otro",
};

export const PRIORITY_VARIANT: Record<
  WorkOrderPriority,
  "muted" | "secondary" | "warning" | "destructive"
> = {
  low: "muted",
  normal: "secondary",
  high: "warning",
  urgent: "destructive",
};

/** Lifecycle order (OT-02). Mirrors public.work_order_status_rank(). */
export const STATUS_FLOW: WorkOrderStatus[] = [
  "draft",
  "pending",
  "planned",
  "in_production",
  "in_installation",
];

export const CLOSED_STATUSES: WorkOrderStatus[] = ["completed", "cancelled"];

export function isClosed(status: WorkOrderStatus) {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Statuses reachable with a plain status change (OT-03): any later step,
 * or one step back. Completing and cancelling have their own actions.
 * The database enforces the same rules.
 */
export function plainTransitions(status: WorkOrderStatus): WorkOrderStatus[] {
  const index = STATUS_FLOW.indexOf(status);
  if (index < 0) return [];
  return STATUS_FLOW.filter((_, other) => other > index || other === index - 1);
}

export function canComplete(status: WorkOrderStatus) {
  return status === "in_production" || status === "in_installation";
}

/** Reservations: open orders before completion (RES-01). */
export function acceptsReservations(status: WorkOrderStatus) {
  return OPEN_WORK_ORDER_STATUSES.includes(status);
}

/** Consumption and waste: only while producing or installing (CON-01). */
export function acceptsConsumption(status: WorkOrderStatus) {
  return status === "in_production" || status === "in_installation";
}

export function isOverdue(dueDate: string | null, status: WorkOrderStatus, today: string) {
  return Boolean(dueDate) && dueDate! < today && !isClosed(status);
}
