import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney, formatQuantityWithUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MaterialDetail } from "../queries";

/** Physical / reserved / available stock, the three numbers that matter most. */
export function StockOverview({ material }: { material: MaterialDetail }) {
  const decimals = material.unit_decimals ?? 4;
  const unit = material.unit_symbol;
  const available = material.stock_available ?? 0;
  const belowMinimum = material.is_active && available <= (material.min_stock ?? 0);

  const items = [
    { label: "Stock físico", value: material.stock_on_hand, hint: "En el almacén" },
    { label: "Reservado", value: material.stock_reserved, hint: "Comprometido para órdenes" },
    {
      label: "Disponible",
      value: available,
      hint: `Mínimo ${formatQuantityWithUnit(material.min_stock, unit, decimals)}`,
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className={cn(
            "gap-1 px-3 py-4 sm:px-5",
            item.highlight && belowMinimum && "border-warning/40 bg-warning/5",
            item.highlight && available <= 0 && "border-destructive/40 bg-destructive/5",
          )}
        >
          <p className="text-xs text-muted-foreground sm:text-sm">{item.label}</p>
          <p
            className={cn(
              "text-lg font-semibold tracking-tight tabular-nums sm:text-2xl",
              item.highlight && belowMinimum && "text-warning",
              item.highlight && available <= 0 && "text-destructive",
            )}
          >
            {formatQuantityWithUnit(item.value, unit, decimals)}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">{item.hint}</p>
        </Card>
      ))}
    </div>
  );
}

export function MaterialDetails({ material }: { material: MaterialDetail }) {
  const decimals = material.unit_decimals ?? 4;
  const rows: [string, React.ReactNode][] = [
    ["Categoría", material.category_name],
    ["Unidad base", `${material.unit_name} (${material.unit_symbol})`],
    ["Ubicación", material.location_name ?? "—"],
    [
      "Proveedor principal",
      material.primary_supplier_id ? (
        <Link
          href={`/suppliers/${material.primary_supplier_id}`}
          className="text-primary hover:underline"
        >
          {material.supplier_name}
        </Link>
      ) : (
        "—"
      ),
    ],
    [
      "Stock máximo",
      material.max_stock === null
        ? "—"
        : formatQuantityWithUnit(material.max_stock, material.unit_symbol, decimals),
    ],
    ["Controla retazos", material.tracks_remnants ? "Sí" : "No"],
    ["Creado", formatDateTime(material.created_at)],
    ["Última modificación", formatDateTime(material.updated_at)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {material.description && (
          <p className="text-sm text-muted-foreground">{material.description}</p>
        )}
        <dl className="grid gap-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function MaterialCosts({ material }: { material: MaterialDetail }) {
  const rows: [string, string, string][] = [
    ["Costo promedio", formatMoney(material.avg_cost), `por ${material.unit_symbol}`],
    ["Último costo", formatMoney(material.last_cost), "última entrada"],
    ["Valor de inventario", formatMoney(material.inventory_value), "físico × promedio"],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Costos</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          {rows.map(([label, value, hint]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">
                {label} <span className="text-xs">· {hint}</span>
              </dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
