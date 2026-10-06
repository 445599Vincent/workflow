import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Órdenes de trabajo" };

export default function Page() {
  return (
    <ComingSoon
      title="Órdenes de trabajo"
      description="Planificación, ejecución y cierre de cada trabajo."
      phase="Fase 3"
      features={[
        "Órdenes con número automático (OT-000001), cliente, prioridad y fecha requerida",
        "Materiales planificados con costo estimado",
        "Reserva de material contra el stock disponible",
        "Registro de consumo real y mermas desde tablet o celular",
        "Timeline de cambios de estado",
        "Cierre con costo estimado vs real",
      ]}
    />
  );
}
