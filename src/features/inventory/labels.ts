import type { Database } from "@/types/database";

export type MovementType = Database["public"]["Enums"]["movement_type"];

type Direction = "in" | "out" | "reserve" | "release";

export const MOVEMENT_TYPES: Record<
  MovementType,
  {
    label: string;
    direction: Direction;
    variant: "success" | "destructive" | "info" | "muted" | "warning";
  }
> = {
  entry: { label: "Entrada", direction: "in", variant: "success" },
  exit: { label: "Salida", direction: "out", variant: "destructive" },
  reservation: { label: "Reserva", direction: "reserve", variant: "info" },
  reservation_release: { label: "Liberación de reserva", direction: "release", variant: "muted" },
  consumption: { label: "Consumo", direction: "out", variant: "warning" },
  waste: { label: "Merma", direction: "out", variant: "destructive" },
  return: { label: "Devolución", direction: "in", variant: "success" },
  adjustment_in: { label: "Ajuste positivo", direction: "in", variant: "success" },
  adjustment_out: { label: "Ajuste negativo", direction: "out", variant: "destructive" },
};

export type StockStatus = "ok" | "low" | "out" | "inactive";

export const STOCK_STATUS: Record<
  StockStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "muted" }
> = {
  ok: { label: "Normal", variant: "success" },
  low: { label: "Bajo mínimo", variant: "warning" },
  out: { label: "Sin existencia", variant: "destructive" },
  inactive: { label: "Inactivo", variant: "muted" },
};

export function toStockStatus(value: string | null | undefined): StockStatus {
  return value === "low" || value === "out" || value === "inactive" ? value : "ok";
}
