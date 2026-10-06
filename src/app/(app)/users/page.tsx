import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Page() {
  await requirePermission("users.manage");
  return (
    <ComingSoon
      title="Usuarios"
      description="Gestión de usuarios y roles."
      phase="Fase 1 (pendiente)"
      features={[
        "Invitar usuarios por correo",
        "Asignar rol: Administrador, Supervisor, Almacén, Producción o Consulta",
        "Desactivar usuarios sin perder su historial",
        "Mientras tanto: crear usuarios desde el panel de Supabase (ver README)",
      ]}
    />
  );
}
