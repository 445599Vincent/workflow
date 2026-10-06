import {
  ClockAlertIcon,
  PackageXIcon,
  ScissorsIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

export type AlertKind = "low_stock" | "over_estimate" | "overdue" | "high_waste";

/** ALR-01..04 */
export const ALERT_KINDS: Record<
  AlertKind,
  { label: string; description: string; icon: LucideIcon; entity: "material" | "order" }
> = {
  low_stock: {
    label: "Stock bajo",
    description: "Materiales con disponible en o bajo el mínimo.",
    icon: PackageXIcon,
    entity: "material",
  },
  overdue: {
    label: "Órdenes atrasadas",
    description: "Órdenes abiertas con la fecha requerida vencida.",
    icon: ClockAlertIcon,
    entity: "order",
  },
  over_estimate: {
    label: "Exceden lo estimado",
    description: "Órdenes cuyo costo real supera el estimado más allá del umbral.",
    icon: TrendingUpIcon,
    entity: "order",
  },
  high_waste: {
    label: "Merma considerable",
    description: "Materiales con merma por encima del umbral dentro de una orden.",
    icon: ScissorsIcon,
    entity: "order",
  },
};

export const ALERT_ORDER: AlertKind[] = ["low_stock", "overdue", "over_estimate", "high_waste"];

export function isAlertKind(value: string | undefined): value is AlertKind {
  return value !== undefined && value in ALERT_KINDS;
}

export function alertHref(kind: AlertKind, entityId: string) {
  return ALERT_KINDS[kind].entity === "material"
    ? `/materials/${entityId}`
    : `/work-orders/${entityId}`;
}
