import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

/** Result returned by every Server Action. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const GENERIC_ERROR = "Ocurrió un error inesperado. Intente de nuevo.";
const FORBIDDEN_ERROR = "No tiene permiso para realizar esta acción.";

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[] | undefined>) {
  return { ok: false, error, fieldErrors } as const;
}

export function validationFailed(error: z.ZodError) {
  return fail("Revise los campos marcados.", z.flattenError(error).fieldErrors);
}

/**
 * Translates database errors into user-facing Spanish messages.
 * Business errors raised by Workflow functions (SQLSTATE P0001, or 42501 /
 * 23505 raised with our own message) are already written for the user.
 */
export function fromDatabaseError(error: PostgrestError | null | undefined): {
  ok: false;
  error: string;
} {
  if (!error) return fail(GENERIC_ERROR);

  switch (error.code) {
    case "P0001":
      return fail(error.message);
    case "42501":
      return fail(error.message.startsWith("No ") ? error.message : FORBIDDEN_ERROR);
    case "23505":
      return fail(
        error.message.startsWith("Ya existe")
          ? error.message
          : "Ya existe un registro con ese valor (código o nombre duplicado).",
      );
    case "23503":
      return fail("El registro hace referencia a datos que no existen o no se pueden usar.");
    case "23514":
    case "22P02":
    case "22003":
      return fail("Algún valor no es válido. Revise los datos ingresados.");
    case "PGRST116":
      return fail("El registro no existe o no tiene acceso a él.");
    default:
      console.error("[database]", error.code, error.message, error.details);
      return fail(GENERIC_ERROR);
  }
}
