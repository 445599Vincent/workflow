import type { Metadata } from "next";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { safeNextPath } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "Iniciar sesión" };

const ERRORS: Record<string, string> = {
  inactive: "Su usuario está desactivado. Contacte a un administrador.",
  link: "El enlace no es válido o expiró. Solicite uno nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Ingrese con su correo y contraseña.</p>
      </div>
      <SignInForm next={next} initialError={error} />
    </div>
  );
}
