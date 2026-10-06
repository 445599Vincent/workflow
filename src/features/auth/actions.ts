"use server";

import { redirect } from "next/navigation";

import { fail, GENERIC_ERROR, ok, validationFailed, type ActionResult } from "@/lib/actions";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  newPasswordSchema,
  passwordResetRequestSchema,
  safeNextPath,
  signInSchema,
  type NewPasswordInput,
  type PasswordResetRequestInput,
  type SignInInput,
} from "./schemas";

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") {
      return fail("Correo o contraseña incorrectos.");
    }
    if (error.code === "user_banned") {
      return fail("Su usuario está desactivado. Contacte a un administrador.");
    }
    if (error.code === "email_not_confirmed") {
      return fail("Debe confirmar su correo antes de iniciar sesión.");
    }
    if (error.status === 429) {
      return fail("Demasiados intentos. Espere unos minutos e intente de nuevo.");
    }
    console.error("[auth] sign in", error.code, error.message);
    return fail(GENERIC_ERROR);
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Always reports success so the form cannot be used to discover accounts. */
export async function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/reset-password`,
  });

  if (error && error.status === 429) {
    return fail("Ya se envió un correo hace poco. Espere unos minutos antes de solicitar otro.");
  }
  if (error) {
    console.error("[auth] password reset", error.code, error.message);
  }
  return ok(undefined);
}

export async function updatePassword(input: NewPasswordInput): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return fail("El enlace de recuperación expiró. Solicite uno nuevo.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return fail("La nueva contraseña debe ser diferente a la anterior.");
    }
    if (error.code === "weak_password") {
      return fail("La contraseña es muy débil. Use una combinación más segura.");
    }
    console.error("[auth] update password", error.code, error.message);
    return fail(GENERIC_ERROR);
  }

  // Clear the "temporary password" flag (D-023); RLS lets users update their own profile.
  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", data.claims.sub)
    .eq("must_change_password", true);

  redirect("/dashboard?notice=password-updated");
}
