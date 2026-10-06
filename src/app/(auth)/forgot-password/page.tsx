import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Le enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
