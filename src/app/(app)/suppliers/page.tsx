import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Proveedores" };

export default function Page() {
  return (
    <ComingSoon
      title="Proveedores"
      description="Catálogo de proveedores de materia prima."
      phase="Fase 2"
      features={[
        "Datos de contacto y RNC",
        "Proveedor principal por material",
        "Historial de compras por proveedor",
        "Preparado para sincronizar con ADM Cloud",
      ]}
    />
  );
}
