import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Movimientos" };

export default function Page() {
  return (
    <ComingSoon
      title="Movimientos"
      description="Historial completo de entradas, salidas, reservas, consumos y ajustes."
      phase="Fase 2"
      features={[
        "Listado global de movimientos con filtros por tipo y fecha",
        "Saldos antes y después de cada movimiento",
        "Referencia a la orden de trabajo o documento de origen",
        "Ajustes de inventario con motivo obligatorio",
      ]}
    />
  );
}
