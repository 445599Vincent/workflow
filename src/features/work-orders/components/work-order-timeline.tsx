import {
  ArrowRightLeftIcon,
  BookmarkMinusIcon,
  BookmarkPlusIcon,
  CirclePlusIcon,
  ListPlusIcon,
  PackageCheckIcon,
  PencilIcon,
  ScissorsIcon,
  Trash2Icon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";

import { formatDateTime, formatMoney, formatQuantityWithUnit } from "@/lib/format";
import { WASTE_REASONS, WORK_ORDER_STATUS, type WasteReason } from "../labels";
import type { WorkOrderEvent } from "../queries";

type Payload = {
  material_id?: string;
  material?: string;
  quantity?: number;
  previous_quantity?: number | null;
  total_cost?: number;
  from_reservation?: number;
  reason?: WasteReason | null;
};

function readPayload(value: unknown): Payload {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Payload) : {};
}

/** Unit of each material on the order, to print quantities with their unit. */
export type TimelineUnits = Record<string, { symbol: string; decimals: number }>;

/** Icon + human sentence for each event the database writes to work_order_events. */
function describe(event: WorkOrderEvent, units: TimelineUnits): { icon: LucideIcon; text: string } {
  const p = readPayload(event.payload);
  const unit = p.material_id ? units[p.material_id] : undefined;
  const qty = (value: number | undefined | null) =>
    formatQuantityWithUnit(value ?? 0, unit?.symbol, unit?.decimals);
  const material = p.material ?? "material";
  switch (event.event_type) {
    case "created":
      return {
        icon: CirclePlusIcon,
        text: `Orden creada${event.to_status ? ` (${WORK_ORDER_STATUS[event.to_status].label})` : ""}`,
      };
    case "status_changed":
      return {
        icon: ArrowRightLeftIcon,
        text: `${event.from_status ? WORK_ORDER_STATUS[event.from_status].label : "—"} → ${
          event.to_status ? WORK_ORDER_STATUS[event.to_status].label : "—"
        }`,
      };
    case "material_planned":
      return { icon: ListPlusIcon, text: `Planificó ${qty(p.quantity)} de ${material}` };
    case "material_updated":
      return {
        icon: PencilIcon,
        text: `Cambió la cantidad estimada de ${material}: ${qty(p.previous_quantity)} → ${qty(p.quantity)}`,
      };
    case "material_removed":
      return { icon: Trash2Icon, text: `Quitó ${material} de la orden` };
    case "material_unplanned":
      return { icon: TriangleAlertIcon, text: `Se usó ${material}, que no estaba planificado` };
    case "reserved":
      return { icon: BookmarkPlusIcon, text: `Reservó ${qty(p.quantity)} de ${material}` };
    case "released":
      return {
        icon: BookmarkMinusIcon,
        text: `Liberó ${qty(p.quantity)} reservado de ${material}`,
      };
    case "consumed":
      return {
        icon: PackageCheckIcon,
        text: `Consumió ${qty(p.quantity)} de ${material} (${formatMoney(p.total_cost)})`,
      };
    case "waste":
      return {
        icon: ScissorsIcon,
        text: `Merma de ${qty(p.quantity)} de ${material}${
          p.reason ? ` · ${WASTE_REASONS[p.reason]}` : ""
        } (${formatMoney(p.total_cost)})`,
      };
    default:
      return { icon: CirclePlusIcon, text: event.event_type };
  }
}

export function WorkOrderTimeline({
  events,
  units,
}: {
  events: WorkOrderEvent[];
  units: TimelineUnits;
}) {
  if (events.length === 0) {
    return <p className="px-6 pb-6 text-sm text-muted-foreground">Sin actividad todavía.</p>;
  }

  return (
    <ol className="space-y-4 px-6 pb-6" data-testid="work-order-timeline">
      {events.map((event) => {
        const { icon: Icon, text } = describe(event, units);
        return (
          <li key={event.id} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 text-sm">
              <p>{text}</p>
              {event.note && <p className="text-muted-foreground">“{event.note}”</p>}
              <p className="text-xs text-muted-foreground">
                {event.author?.full_name ?? "Sistema"} · {formatDateTime(event.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
