import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Compras / Entradas" };

export default function Page() {
  return (
    <ComingSoon
      title="Compras / Entradas"
      description="Registro de compras y entradas de material al almacén."
      phase="Fase 2"
      features={[
        "Entradas con varias líneas y número automático (ENT-000001)",
        "Proveedor y número de factura",
        "Recalculo automático del costo promedio",
        "Anulación con motivo (sin borrar historial)",
      ]}
    />
  );
}
