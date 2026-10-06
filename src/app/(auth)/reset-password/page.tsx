import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Reached from the recovery e-mail (via /auth/confirm, which opens a session)
// or by a signed-in user; the proxy sends anyone else to /login.
export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crear nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Elija una contraseña segura que no use en otros sitios.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
