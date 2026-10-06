import { z } from "zod";

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
const INVALID_NUMBER = "Ingrese un número válido (use punto para decimales, ej. 12.5).";

function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "");
  if (normalized === "") return null;
  return DECIMAL_PATTERN.test(normalized) ? Number(normalized) : Number.NaN;
}

/**
 * Numeric form fields are edited as text (inputMode="decimal" works better on
 * phones than type="number") and parsed here, so client and server share the
 * exact same rules.
 */
export function decimalField(options: { min?: number; maxDecimals?: number } = {}) {
  const { min = 0, maxDecimals = 4 } = options;
  return z
    .string()
    .transform(parseDecimal)
    .refine((value) => value === null || !Number.isNaN(value), INVALID_NUMBER)
    .refine((value) => value === null || value >= min, `Debe ser mayor o igual a ${min}.`)
    .refine(
      (value) => value === null || Number(value.toFixed(maxDecimals)) === value,
      `Use como máximo ${maxDecimals} decimales.`,
    );
}

/** Required decimal: empty input is rejected. */
export function requiredDecimalField(options: { min?: number; maxDecimals?: number } = {}) {
  return decimalField(options)
    .refine((value) => value !== null, "Este campo es obligatorio.")
    .transform((value) => value as number);
}

export const optionalUuid = z
  .string()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.uuid("Seleccione una opción válida.").nullable());

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => (value === "" ? null : value));

/** True when a decimal text has more decimal places than the unit allows. */
export function exceedsDecimals(value: string, decimals: number): boolean {
  const fraction = value.trim().split(".")[1] ?? "";
  return fraction.replace(/0+$/, "").length > decimals;
}

/** "solo números enteros" / "hasta 2 decimales" */
export function decimalsHint(decimals: number): string {
  return decimals === 0 ? "solo números enteros" : `hasta ${decimals} decimales`;
}
