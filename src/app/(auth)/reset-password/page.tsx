import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Reached from the recovery e-mail (via /auth/confirm, which opens a session)
// by a signed-in user, or forced after an administrator set a temporary
// password (?required=1). The proxy sends anyone else to /login.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { required } = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crear nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">
          {required
            ? "Está usando una contraseña temporal. Por seguridad, elija una nueva para continuar."
            : "Elija una contraseña segura que no use en otros sitios."}
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
