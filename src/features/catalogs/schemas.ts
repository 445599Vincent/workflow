import { z } from "zod";

import type { Database } from "@/types/database";
import { optionalText } from "@/lib/validation";

export type UnitKind = Database["public"]["Enums"]["unit_kind"];

export const UNIT_KINDS: Record<UnitKind, string> = {
  count: "Conteo (unidades, piezas)",
  length: "Longitud (metros, pies)",
  area: "Área (m², pie²)",
  volume: "Volumen (litros, galones)",
  mass: "Masa (kg, gramos)",
  package: "Empaque (rollos, cajas, láminas)",
};

const name = (max: number) =>
  z.string().trim().min(2, "Ingrese el nombre.").max(max, `Máximo ${max} caracteres.`);

export const categoryFormSchema = z.object({
  name: name(60),
  description: optionalText(200),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{0,3}$/, "Use un número de 0 a 999.")
    .transform((value) => (value === "" ? 0 : Number(value))),
  isActive: z.boolean(),
});
export type CategoryFormValues = z.input<typeof categoryFormSchema>;

export const unitFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{1,10}$/, "Use de 1 a 10 letras minúsculas, números o guion bajo (ej. m2)."),
  name: name(40),
  symbol: z.string().trim().min(1, "Ingrese el símbolo.").max(10, "Máximo 10 caracteres."),
  kind: z.enum(Object.keys(UNIT_KINDS) as [UnitKind, ...UnitKind[]], {
    error: "Seleccione el tipo.",
  }),
  decimals: z.coerce.number<string>().int().min(0).max(4),
  isActive: z.boolean(),
});
export type UnitFormValues = z.input<typeof unitFormSchema>;

export const locationFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Ingrese el código.")
    .max(20, "Máximo 20 caracteres.")
    .regex(/^[A-Za-z0-9._\-/]+$/, "Use letras, números, guiones o puntos (ej. EST-A).")
    .transform((value) => value.toUpperCase()),
  name: name(60),
  description: optionalText(200),
  isActive: z.boolean(),
});
export type LocationFormValues = z.input<typeof locationFormSchema>;
