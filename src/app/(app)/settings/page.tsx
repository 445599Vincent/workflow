import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Configuración" };

export default function Page() {
  return (
    <ComingSoon
      title="Configuración"
      description="Parámetros generales de Workflow."
      phase="Fase 2"
      features={[
        "Categorías, unidades de medida y ubicaciones",
        "Moneda y zona horaria",
        "Umbrales de alerta de consumo y merma",
        "Permisos por rol",
      ]}
    />
  );
}
