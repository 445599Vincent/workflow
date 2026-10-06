import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Ingrese su correo electrónico.")
  .pipe(z.email("Ingrese un correo electrónico válido."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Ingrese su contraseña."),
  next: z.string().optional(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const passwordResetRequestSchema = z.object({ email });
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const MIN_PASSWORD_LENGTH = 8;

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      ),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/** Only same-site relative paths are accepted as post-login destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
