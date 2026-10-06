import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Inventario" };

export default function Page() {
  return (
    <ComingSoon
      title="Inventario"
      description="Existencias físicas, reservadas y disponibles de todos los materiales."
      phase="Fase 2"
      features={[
        "Stock físico, reservado y disponible",
        "Valor de inventario por material y categoría",
        "Filtros por categoría, ubicación y estado",
        "Exportación a Excel",
      ]}
    />
  );
}
