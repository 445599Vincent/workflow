import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Reportes" };

export default function Page() {
  return (
    <ComingSoon
      title="Reportes"
      description="Análisis de consumo, mermas y costos."
      phase="Fase 4"
      features={[
        "Inventario actual y materiales bajo mínimo",
        "Consumo por período, material, orden y cliente",
        "Merma por material y por orden",
        "Costo por orden y estimado vs real",
        "Movimientos de inventario",
        "Exportación a Excel / CSV",
      ]}
    />
  );
}
