import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "@/features/auth/schemas";
import type { RoleCode } from "@/lib/auth/permissions";

const ROLE_CODES = [
  "admin",
  "supervisor",
  "warehouse",
  "production",
  "viewer",
] as const satisfies RoleCode[];

const fullName = z
  .string()
  .trim()
  .min(3, "Ingrese nombre y apellido.")
  .max(120, "Máximo 120 caracteres.");
const roleCode = z.enum(ROLE_CODES, { error: "Seleccione el rol." });
const temporaryPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
  .max(72, "Máximo 72 caracteres.");

export const createUserSchema = z.object({
  fullName,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingrese el correo.")
    .pipe(z.email("Ingrese un correo electrónico válido.")),
  roleCode,
  temporaryPassword,
});
export type CreateUserValues = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName,
  roleCode,
  isActive: z.boolean(),
});
export type UpdateUserValues = z.input<typeof updateUserSchema>;

export const resetPasswordSchema = z.object({ temporaryPassword });
export type ResetPasswordValues = z.input<typeof resetPasswordSchema>;

/** Readable temporary password (no ambiguous characters such as 0/O, 1/l). */
export function generateTemporaryPassword(length = 10): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}
