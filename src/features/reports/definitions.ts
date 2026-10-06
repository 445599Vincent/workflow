import { toCsv } from "@/lib/csv";
import { formatMoney, formatPercent, formatQuantity, formatDateTime } from "@/lib/format";
import type { Database } from "@/types/database";
import type { Report } from "./queries";
import type { ReportView } from "./schemas";

type Fn = Database["public"]["Functions"];
type MaterialRow = Fn["report_usage_by_material"]["Returns"][number];
type OrderRow = Fn["report_orders_cost"]["Returns"][number];
type CustomerRow = Fn["report_usage_by_customer"]["Returns"][number];
type InventoryRow = Extract<Report, { view: "inventory" }>["rows"][number];

/**
 * One column of a report: the raw value goes to CSV and totals, the display
 * text to the screen. The same definitions feed both (REP-07).
 */
type Column<Row> = {
  header: string;
  value: (row: Row) => string | number | null;
  display?: (row: Row) => string;
  numeric?: boolean;
  /** Footer total: money columns add up. */
  sum?: boolean;
  /** Hidden on small screens (still exported). */
  secondary?: boolean;
  href?: (row: Row) => string | null;
};

export type ReportCell = { text: string; raw: string | number | null; href: string | null };
export type ReportTable = {
  columns: { header: string; numeric: boolean; secondary: boolean }[];
  rows: ReportCell[][];
  totals: (string | null)[] | null;
  rawTotals: (number | null)[] | null;
};

const money = (value: number | null) => formatMoney(value ?? 0);
const pct = (value: number | null) => (value === null ? "—" : formatPercent(value / 100));
const round2 = (value: number | null) => (value === null ? null : Math.round(value * 100) / 100);

function build<Row>(columns: Column<Row>[], rows: Row[]): ReportTable {
  const hasTotals = columns.some((column) => column.sum);
  const rawTotals = hasTotals
    ? columns.map((column) =>
        column.sum
          ? round2(rows.reduce((acc, row) => acc + Number(column.value(row) ?? 0), 0))
          : null,
      )
    : null;
  return {
    columns: columns.map((column) => ({
      header: column.header,
      numeric: Boolean(column.numeric),
      secondary: Boolean(column.secondary),
    })),
    rows: rows.map((row) =>
      columns.map((column) => {
        const raw = column.value(row);
        return {
          raw,
          text: column.display ? column.display(row) : raw === null ? "—" : String(raw),
          href: column.href?.(row) ?? null,
        };
      }),
    ),
    totals: rawTotals ? rawTotals.map((value) => (value === null ? null : money(value))) : null,
    rawTotals,
  };
}

const MATERIAL_COLUMNS: Column<MaterialRow>[] = [
  { header: "Código", value: (r) => r.sku, secondary: true },
  { header: "Material", value: (r) => r.name, href: (r) => `/materials/${r.material_id}` },
  { header: "Categoría", value: (r) => r.category, secondary: true },
  { header: "Unidad", value: (r) => r.unit_symbol, secondary: true },
  {
    header: "Consumo",
    numeric: true,
    value: (r) => r.consumed_quantity,
    display: (r) => formatQuantity(r.consumed_quantity, r.unit_decimals),
  },
  {
    header: "Costo consumo",
    numeric: true,
    sum: true,
    secondary: true,
    value: (r) => round2(r.consumed_cost),
    display: (r) => money(r.consumed_cost),
  },
  {
    header: "Merma",
    numeric: true,
    value: (r) => r.waste_quantity,
    display: (r) => formatQuantity(r.waste_quantity, r.unit_decimals),
  },
  {
    header: "Costo merma",
    numeric: true,
    sum: true,
    secondary: true,
    value: (r) => round2(r.waste_cost),
    display: (r) => money(r.waste_cost),
  },
  { header: "% merma", numeric: true, value: (r) => r.waste_pct, display: (r) => pct(r.waste_pct) },
  {
    header: "Costo total",
    numeric: true,
    sum: true,
    value: (r) => round2(r.total_cost),
    display: (r) => money(r.total_cost),
  },
];

const ORDER_COLUMNS: Column<OrderRow>[] = [
  { header: "Orden", value: (r) => r.number, href: (r) => `/work-orders/${r.work_order_id}` },
  { header: "Trabajo", value: (r) => r.title, secondary: true },
  { header: "Cliente", value: (r) => r.customer_name ?? "Sin cliente", secondary: true },
  {
    header: "Terminada",
    value: (r) => r.completed_at,
    display: (r) => formatDateTime(r.completed_at),
    secondary: true,
  },
  {
    header: "Estimado",
    numeric: true,
    sum: true,
    value: (r) => round2(r.estimated_cost),
    display: (r) => money(r.estimated_cost),
  },
  {
    header: "Real",
    numeric: true,
    sum: true,
    value: (r) => round2(r.actual_cost),
    display: (r) => money(r.actual_cost),
  },
  {
    header: "Merma",
    numeric: true,
    sum: true,
    secondary: true,
    value: (r) => round2(r.waste_cost),
    display: (r) => money(r.waste_cost),
  },
  {
    header: "Variación",
    numeric: true,
    sum: true,
    value: (r) => round2(r.variance),
    display: (r) => money(r.variance),
  },
  {
    header: "Variación %",
    numeric: true,
    value: (r) => r.variance_pct,
    display: (r) => pct(r.variance_pct),
  },
];

const CUSTOMER_COLUMNS: Column<CustomerRow>[] = [
  { header: "Cliente", value: (r) => r.customer_name },
  { header: "Órdenes", numeric: true, value: (r) => r.orders },
  {
    header: "Consumo",
    numeric: true,
    sum: true,
    value: (r) => round2(r.consumed_cost),
    display: (r) => money(r.consumed_cost),
  },
  {
    header: "Merma",
    numeric: true,
    sum: true,
    value: (r) => round2(r.waste_cost),
    display: (r) => money(r.waste_cost),
  },
  {
    header: "Total",
    numeric: true,
    sum: true,
    value: (r) => round2(r.total_cost),
    display: (r) => money(r.total_cost),
  },
];

const STOCK_STATUS: Record<string, string> = {
  out: "Sin existencia",
  low: "Bajo mínimo",
  ok: "Normal",
  inactive: "Inactivo",
};

const INVENTORY_COLUMNS: Column<InventoryRow>[] = [
  { header: "Código", value: (r) => r.sku, secondary: true },
  { header: "Material", value: (r) => r.name },
  { header: "Categoría", value: (r) => r.category, secondary: true },
  { header: "Unidad", value: (r) => r.unit_symbol, secondary: true },
  {
    header: "Físico",
    numeric: true,
    value: (r) => r.stock_on_hand,
    display: (r) => formatQuantity(r.stock_on_hand, r.unit_decimals),
  },
  {
    header: "Reservado",
    numeric: true,
    secondary: true,
    value: (r) => r.stock_reserved,
    display: (r) => formatQuantity(r.stock_reserved, r.unit_decimals),
  },
  {
    header: "Disponible",
    numeric: true,
    value: (r) => r.stock_available,
    display: (r) => formatQuantity(r.stock_available, r.unit_decimals),
  },
  {
    header: "Mínimo",
    numeric: true,
    secondary: true,
    value: (r) => r.min_stock,
    display: (r) => formatQuantity(r.min_stock, r.unit_decimals),
  },
  {
    header: "Costo promedio",
    numeric: true,
    secondary: true,
    value: (r) => r.avg_cost,
    display: (r) => money(r.avg_cost),
  },
  {
    header: "Valor",
    numeric: true,
    sum: true,
    value: (r) => round2(r.inventory_value),
    display: (r) => money(r.inventory_value),
  },
  {
    header: "Estado",
    value: (r) => STOCK_STATUS[r.stock_status] ?? r.stock_status,
    secondary: true,
  },
];

export function buildReportTable(report: Report): ReportTable {
  switch (report.view) {
    case "materials":
      return build(MATERIAL_COLUMNS, report.rows);
    case "orders":
      return build(ORDER_COLUMNS, report.rows);
    case "customers":
      return build(CUSTOMER_COLUMNS, report.rows);
    case "inventory":
      return build(INVENTORY_COLUMNS, report.rows);
  }
}

export function reportToCsv(table: ReportTable): string {
  const rows: (string | number | null)[][] = table.rows.map((row) => row.map((cell) => cell.raw));
  if (table.rawTotals) {
    rows.push(table.rawTotals.map((value, index) => (index === 0 ? "Total" : value)));
  }
  return toCsv(
    table.columns.map((column) => column.header),
    rows,
  );
}

export function reportFileName(view: ReportView, from: string, to: string) {
  const slug = {
    materials: "consumo-por-material",
    orders: "costo-por-orden",
    customers: "consumo-por-cliente",
    inventory: "inventario-actual",
  }[view];
  return view === "inventory" ? `${slug}-${to}.csv` : `${slug}-${from}-a-${to}.csv`;
}
