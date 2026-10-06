import { z } from "zod";

import type { ParsedCsv } from "@/lib/csv-parse";

/**
 * Material import from CSV (IMP-01..06, D-033). Shared by the browser
 * preview and the Server Action; the database re-validates everything.
 */
export const IMPORT_MAX_ROWS = 2000;

export type ImportRow = {
  sku: string | null;
  name: string;
  category: string;
  unit: string;
  min_stock: number | null;
  max_stock: number | null;
  location: string | null;
  supplier: string | null;
  opening_quantity: number | null;
  opening_unit_cost: number | null;
  description: string | null;
};
type ImportKey = keyof ImportRow;

/** Accepted header names (normalised: lower case, no accents, "_" for spaces). */
const HEADER_ALIASES: Record<ImportKey, string[]> = {
  sku: ["codigo", "sku", "cod"],
  name: ["nombre", "material", "descripcion_corta"],
  category: ["categoria"],
  unit: ["unidad", "unidad_base", "um"],
  min_stock: ["minimo", "stock_minimo", "min"],
  max_stock: ["maximo", "stock_maximo", "max"],
  location: ["ubicacion"],
  supplier: ["proveedor", "proveedor_principal"],
  opening_quantity: ["existencia_inicial", "existencia", "cantidad", "stock"],
  opening_unit_cost: ["costo_unitario", "costo", "costo_promedio"],
  description: ["descripcion", "notas"],
};

const NUMERIC_KEYS: ImportKey[] = [
  "min_stock",
  "max_stock",
  "opening_quantity",
  "opening_unit_cost",
];
export const REQUIRED_COLUMNS: ImportKey[] = ["name", "category", "unit"];

export const COLUMN_LABELS: Record<ImportKey, string> = {
  sku: "codigo",
  name: "nombre",
  category: "categoria",
  unit: "unidad",
  min_stock: "minimo",
  max_stock: "maximo",
  location: "ubicacion",
  supplier: "proveedor",
  opening_quantity: "existencia_inicial",
  opening_unit_cost: "costo_unitario",
  description: "descripcion",
};

function normaliseHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** "1,234.50" (comma file) or "1.234,50" (semicolon file) → 1234.5; "" → null. */
function parseNumber(raw: string, decimalComma: boolean): number | null | "invalid" {
  let text = raw.trim().replace(/\s/g, "");
  if (text === "") return null;
  text = decimalComma ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : "invalid";
}

export type PreparedImport = {
  rows: ImportRow[];
  /** Problems found while reading the file, by file row number (2 = first data row). */
  errors: Map<number, string[]>;
  missingColumns: string[];
  unknownColumns: string[];
};

/** Maps CSV columns to import fields and parses numbers; no catalog checks. */
export function prepareImport(csv: ParsedCsv): PreparedImport {
  const columnIndex = new Map<ImportKey, number>();
  const unknownColumns: string[] = [];
  csv.headers.forEach((header, index) => {
    const normalised = normaliseHeader(header);
    const key = (Object.keys(HEADER_ALIASES) as ImportKey[]).find((candidate) =>
      HEADER_ALIASES[candidate].includes(normalised),
    );
    if (key && !columnIndex.has(key)) columnIndex.set(key, index);
    else if (header) unknownColumns.push(header);
  });
  const missingColumns = REQUIRED_COLUMNS.filter((key) => !columnIndex.has(key)).map(
    (key) => COLUMN_LABELS[key],
  );

  const errors = new Map<number, string[]>();
  const decimalComma = csv.delimiter === ";";
  const rows = csv.rows.map((cells, index) => {
    const rowNumber = index + 2;
    const text = (key: ImportKey) => {
      const position = columnIndex.get(key);
      return position === undefined ? "" : (cells[position] ?? "").trim();
    };
    const row: ImportRow = {
      sku: text("sku") || null,
      name: text("name"),
      category: text("category"),
      unit: text("unit"),
      min_stock: null,
      max_stock: null,
      location: text("location") || null,
      supplier: text("supplier") || null,
      opening_quantity: null,
      opening_unit_cost: null,
      description: text("description") || null,
    };
    const rowErrors: string[] = [];
    for (const key of NUMERIC_KEYS) {
      const value = parseNumber(text(key), decimalComma);
      if (value === "invalid")
        rowErrors.push(`${COLUMN_LABELS[key]}: "${text(key)}" no es un número`);
      else if (value !== null && value < 0)
        rowErrors.push(`${COLUMN_LABELS[key]} no puede ser negativo`);
      else (row[key] as number | null) = value;
    }
    if (!row.name) rowErrors.push("falta el nombre");
    if (!row.category) rowErrors.push("falta la categoría");
    if (!row.unit) rowErrors.push("falta la unidad");
    if (rowErrors.length) errors.set(rowNumber, rowErrors);
    return row;
  });

  return { rows, errors, missingColumns, unknownColumns };
}

// -----------------------------------------------------------------------------
// Server-side payload validation (the database validates catalogs and codes).
// -----------------------------------------------------------------------------
const nullableNumber = z.number().nonnegative().finite().nullable();
const nullableText = (max: number) => z.string().trim().max(max).nullable();

export const importRowSchema = z.object({
  sku: nullableText(40),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(20),
  min_stock: nullableNumber,
  max_stock: nullableNumber,
  location: nullableText(100),
  supplier: nullableText(200),
  opening_quantity: nullableNumber,
  opening_unit_cost: nullableNumber,
  description: nullableText(1000),
});

export const importPayloadSchema = z.object({
  rows: z
    .array(importRowSchema)
    .min(1, "El archivo no tiene filas.")
    .max(IMPORT_MAX_ROWS, `Máximo ${IMPORT_MAX_ROWS} filas por archivo.`),
  createCatalogs: z.boolean(),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;

/** Template with the expected columns and two examples (IMP-01). */
export const IMPORT_TEMPLATE = [
  "codigo,nombre,categoria,unidad,minimo,maximo,ubicacion,proveedor,existencia_inicial,costo_unitario,descripcion",
  ",Vinil blanco brillante 1.52 m,Viniles,m2,20,200,,,150,325.50,Rollo de 50 m",
  "TOR-001,Tornillo autorroscante 1/4 x 2,Tornillería y fijaciones,und,500,,,,1200,4.50,",
].join("\r\n");
