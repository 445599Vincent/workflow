import {
  AlarmClockIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
  PackageXIcon,
  ScaleIcon,
  TrendingDownIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { formatMoney, formatPercent, pluralize } from "@/lib/format";
import type { DashboardSummary } from "../queries";

export function KpiGrid({ summary }: { summary: DashboardSummary }) {
  const estimated = summary.estimated_cost_completed_month;
  const actual = summary.actual_cost_completed_month;
  const variance = estimated > 0 ? (actual - estimated) / estimated : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 [&>*]:animate-enter-stagger">
      <StatCard
        index={0}
        label="Órdenes activas"
        value={summary.active_work_orders}
        icon={ClipboardListIcon}
        hint="Pendientes, planificadas o en ejecución"
      />
      <StatCard
        index={1}
        label="Órdenes atrasadas"
        value={summary.overdue_work_orders}
        icon={AlarmClockIcon}
        tone={summary.overdue_work_orders > 0 ? "danger" : "default"}
        hint="Fecha requerida vencida"
      />
      <StatCard
        index={2}
        label="Valor de inventario"
        value={formatMoney(summary.inventory_value)}
        icon={WalletIcon}
        hint={pluralize(summary.active_materials, "material activo", "materiales activos")}
        href="/inventory"
      />
      <StatCard
        index={3}
        label="Materiales bajo mínimo"
        value={summary.low_stock_materials}
        icon={PackageXIcon}
        tone={summary.low_stock_materials > 0 ? "warning" : "success"}
        hint="Disponible ≤ stock mínimo"
        href="/materials?status=low"
      />
      <StatCard
        index={4}
        label="Consumo del mes"
        value={formatMoney(summary.consumption_cost_month)}
        icon={WrenchIcon}
        hint="Material útil usado en órdenes"
      />
      <StatCard
        index={5}
        label="Merma del mes"
        value={formatMoney(summary.waste_cost_month)}
        icon={TrendingDownIcon}
        tone={summary.waste_cost_month > 0 ? "warning" : "default"}
        hint="Desperdicio registrado"
      />
      <StatCard
        index={6}
        label="Órdenes terminadas"
        value={summary.completed_this_month}
        icon={CircleCheckBigIcon}
        tone="success"
        hint="Cerradas este mes"
      />
      <StatCard
        index={7}
        label="Estimado vs real"
        value={variance === null ? "—" : `${variance > 0 ? "+" : ""}${formatPercent(variance)}`}
        icon={ScaleIcon}
        tone={variance === null ? "default" : variance > 0.1 ? "danger" : "success"}
        hint={
          variance === null
            ? "Sin órdenes cerradas este mes"
            : `${formatMoney(actual)} real / ${formatMoney(estimated)} estimado`
        }
      />
    </div>
  );
}
