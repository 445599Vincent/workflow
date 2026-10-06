import { z } from "zod";

import { normalizeForSearch } from "@/lib/text";
import { decimalsHint, exceedsDecimals } from "@/lib/validation";
import { createMaterialSchema, type CreateMaterialFormValues } from "./schemas";

/**
 * Material catalog import (MAT-01…05, D-033). Pure functions shared by the
 * template download and the Server Actions: the file is parsed and validated on
 * the server, with the same zod schema as the "Nuevo material" form, and
 * import_materials re-checks everything in one transaction.
 */

export const MAX_IMPORT_ROWS = 2000;
/** Server Actions accept 1 MB bodies by default; leave room for the envelope. */
export const MAX_IMPORT_BYTES = 900_000;

type ColumnKey =
  | "sku"
  | "name"
  | "category"
  | "unit"
  | "description"
  | "minStock"
  | "maxStock"
  | "location"
  | "supplier"
  | "tracksRemnants"
  | "openingQuantity"
  | "openingUnitCost";

type ImportColumn = {
  key: ColumnKey;
  label: string;
  required: boolean;
  /** Other accepted headers (compared without accents or case). */
  aliases: string[];
  help: string;
  example: string;
};

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    key: "sku",
    label: "Código",
    required: false,
    aliases: ["sku", "cod", "codigo del material"],
    help: "Vacío = se asigna automáticamente (MAT-0001…).",
    example: "VIN-BLA-01",
  },
  {
    key: "name",
    label: "Nombre",
    required: true,
    aliases: ["material", "nombre del material"],
    help: "Nombre del material.",
    example: "Vinil blanco brillante",
  },
  {
    key: "category",
    label: "Categoría",
    required: true,
    aliases: [],
    help: "Nombre de una categoría activa de Configuración.",
    example: "Viniles",
  },
  {
    key: "unit",
    label: "Unidad",
    required: true,
    aliases: ["unidad de medida", "unidad base"],
    help: "Código, símbolo o nombre de la unidad base (m2, ml, und…).",
    example: "m2",
  },
  {
    key: "description",
    label: "Descripción",
    required: false,
    aliases: ["detalle"],
    help: "Opcional.",
    example: "Rollo de 1.52 m",
  },
  {
    key: "minStock",
    label: "Stock mínimo",
    required: false,
    aliases: ["minimo", "existencia minima"],
    help: "Vacío = 0. Genera la alerta de bajo mínimo.",
    example: "30",
  },
  {
    key: "maxStock",
    label: "Stock máximo",
    required: false,
    aliases: ["maximo", "existencia maxima"],
    help: "Opcional; no menor que el mínimo.",
    example: "200",
  },
  {
    key: "location",
    label: "Ubicación",
    required: false,
    aliases: [],
    help: "Código o nombre de una ubicación activa.",
    example: "A-01",
  },
  {
    key: "supplier",
    label: "Proveedor",
    required: false,
    aliases: ["proveedor principal"],
    help: "Código o nombre de un proveedor activo.",
    example: "",
  },
  {
    key: "tracksRemnants",
    label: "Maneja retazos",
    required: false,
    aliases: ["retazos"],
    help: "Sí / No. Vacío = No.",
    example: "Sí",
  },
  {
    key: "openingQuantity",
    label: "Existencia inicial",
    required: false,
    aliases: ["cantidad inicial", "stock inicial", "existencia", "cantidad"],
    help: "En la unidad base, con su precisión. Vacío = sin existencia.",
    example: "100",
  },
  {
    key: "openingUnitCost",
    label: "Costo unitario",
    required: false,
    aliases: ["costo", "costo inicial", "costo unitario inicial"],
    help: "RD$ por unidad. Obligatorio si hay existencia inicial.",
    example: "300",
  },
];

const COLUMN_LABELS = Object.fromEntries(
  IMPORT_COLUMNS.map((column) => [column.key, column.label]),
) as Record<ColumnKey, string>;

// -----------------------------------------------------------------------------
// CSV parsing
// -----------------------------------------------------------------------------
export type CsvDelimiter = "," | ";" | "\t";

/** Excel saves CSV with "," or ";" depending on the regional settings. */
function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = ([",", ";", "\t"] as const).map((delimiter) => ({
    delimiter,
    count: firstLine.split(delimiter).length - 1,
  }));
  return counts.reduce((best, item) => (item.count > best.count ? item : best)).delimiter;
}

/** RFC 4180: quoted fields may contain the delimiter, quotes ("") and line breaks. */
export function parseCsv(input: string): { delimiter: CsvDelimiter; rows: string[][] } {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"' && value === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(value);
      value = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return { delimiter, rows };
}

// -----------------------------------------------------------------------------
// Cell normalisation
// -----------------------------------------------------------------------------
function headerKey(value: string): string {
  return normalizeForSearch(value.replace(/\(.*?\)/g, "").replace(/\*/g, "")).replace(/\s+/g, " ");
}

/**
 * "RD$ 1,250.50" → "1250.50". Files saved with ";" use the comma as decimal
 * separator ("12,5" → "12.5"); with "," a comma can only be a thousands mark.
 */
export function normalizeNumber(value: string, delimiter: CsvDelimiter): string {
  const text = value.replace(/RD\$|\$|\s| /gi, "");
  if (delimiter === ";" && /^-?\d+,\d+$/.test(text)) return text.replace(",", ".");
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) return text.replaceAll(",", "");
  return text;
}

const YES = new Set(["si", "s", "yes", "y", "true", "verdadero", "1", "x"]);
const NO = new Set(["no", "n", "false", "falso", "0", ""]);

function parseYesNo(value: string): boolean | null {
  const key = normalizeForSearch(value);
  if (YES.has(key)) return true;
  if (NO.has(key)) return false;
  return null;
}

// -----------------------------------------------------------------------------
// Catalog lookups
// -----------------------------------------------------------------------------
type CatalogItem = { id: string; is_active: boolean };

export type ImportCatalogs = {
  categories: (CatalogItem & { name: string })[];
  units: (CatalogItem & { code: string; name: string; symbol: string; decimals: number })[];
  locations: (CatalogItem & { code: string; name: string })[];
  suppliers: (CatalogItem & { code: string | null; name: string })[];
  /** Every existing material (active or not): SKUs and names must not repeat. */
  materials: { sku: string; name: string }[];
};

type Lookup<T> = Map<string, T[]>;

function buildLookup<T>(items: T[], keys: (item: T) => (string | null)[]): Lookup<T> {
  const lookup: Lookup<T> = new Map();
  for (const item of items) {
    const itemKeys = new Set(keys(item).filter((key): key is string => Boolean(key)));
    for (const key of itemKeys) {
      const normalized = normalizeForSearch(key);
      lookup.set(normalized, [...(lookup.get(normalized) ?? []), item]);
    }
  }
  return lookup;
}

/** Resolves a catalog value; returns the item or a message for the user. */
function resolve<T extends CatalogItem>(
  lookup: Lookup<T>,
  value: string,
): { item: T } | { error: string } {
  const matches = lookup.get(normalizeForSearch(value)) ?? [];
  const [first, ...others] = matches.filter((item) => item.is_active);
  if (first && others.length === 0) return { item: first };
  if (first) return { error: `"${value}" coincide con varios registros; use el código.` };
  if (matches.length > 0) return { error: `"${value}" es un registro inactivo.` };
  return { error: `"${value}" no existe.` };
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------
/** Row sent to the import_materials RPC (ids already resolved). */
export type ImportMaterialRow = {
  line: number;
  sku: string | null;
  name: string;
  description: string | null;
  category_id: string;
  base_unit_id: string;
  min_stock: number;
  max_stock: number | null;
  location_id: string | null;
  primary_supplier_id: string | null;
  tracks_remnants: boolean;
  opening_quantity: number | null;
  opening_unit_cost: number | null;
};

/** What the preview shows for each data row of the file. */
export type ImportPreviewRow = {
  line: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  openingQuantity: number | null;
  openingUnitCost: number | null;
  errors: string[];
};

export type ImportValidation = {
  /** Problems with the file itself (no row can be imported). */
  fileErrors: string[];
  ignoredColumns: string[];
  rows: ImportPreviewRow[];
  /** Ready for the RPC; only meaningful when there are no errors at all. */
  materials: ImportMaterialRow[];
};

const SCHEMA_FIELD_COLUMN: Partial<Record<keyof CreateMaterialFormValues, ColumnKey>> = {
  sku: "sku",
  name: "name",
  description: "description",
  categoryId: "category",
  baseUnitId: "unit",
  minStock: "minStock",
  maxStock: "maxStock",
  locationId: "location",
  primarySupplierId: "supplier",
  openingQuantity: "openingQuantity",
  openingUnitCost: "openingUnitCost",
};

export function validateMaterialImport(text: string, catalogs: ImportCatalogs): ImportValidation {
  const empty: ImportValidation = { fileErrors: [], ignoredColumns: [], rows: [], materials: [] };
  const { delimiter, rows } = parseCsv(text);
  const nonEmpty = rows
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""));

  const [header, ...data] = nonEmpty;
  if (!header) return { ...empty, fileErrors: ["El archivo está vacío."] };

  // Map headers to columns.
  const columnIndex = new Map<ColumnKey, number>();
  const ignoredColumns: string[] = [];
  const fileErrors: string[] = [];
  header.cells.forEach((cell, index) => {
    const key = headerKey(cell);
    if (key === "") return;
    const column = IMPORT_COLUMNS.find(
      (item) => headerKey(item.label) === key || item.aliases.includes(key),
    );
    if (!column) {
      ignoredColumns.push(cell.trim());
    } else if (columnIndex.has(column.key)) {
      fileErrors.push(`La columna "${column.label}" está repetida.`);
    } else {
      columnIndex.set(column.key, index);
    }
  });

  const missing = IMPORT_COLUMNS.filter(
    (column) => column.required && !columnIndex.has(column.key),
  );
  if (missing.length > 0) {
    fileErrors.push(
      `Faltan columnas obligatorias: ${missing.map((column) => column.label).join(", ")}. ` +
        "La primera fila debe tener los encabezados de la plantilla.",
    );
  }
  if (data.length === 0) fileErrors.push("El archivo no tiene filas de materiales.");
  if (data.length > MAX_IMPORT_ROWS) {
    fileErrors.push(
      `El archivo tiene ${data.length} materiales; el máximo por importación es ${MAX_IMPORT_ROWS}.`,
    );
  }
  if (fileErrors.length > 0) return { ...empty, fileErrors, ignoredColumns };

  const lookups = {
    categories: buildLookup(catalogs.categories, (item) => [item.name]),
    units: buildLookup(catalogs.units, (item) => [item.code, item.symbol, item.name]),
    locations: buildLookup(catalogs.locations, (item) => [item.code, item.name]),
    suppliers: buildLookup(catalogs.suppliers, (item) => [item.code, item.name]),
  };
  const existingSkus = new Set(catalogs.materials.map((material) => material.sku.toUpperCase()));
  const existingNames = new Map(
    catalogs.materials.map((material) => [normalizeForSearch(material.name), material.sku]),
  );
  const fileSkus = new Map<string, number>();
  const fileNames = new Map<string, number>();

  const previewRows: ImportPreviewRow[] = [];
  const materials: ImportMaterialRow[] = [];

  for (const { cells, line } of data) {
    const cell = (key: ColumnKey) => {
      const index = columnIndex.get(key);
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };
    const errors: string[] = [];
    const columnErrors = new Set<ColumnKey>();
    const addError = (key: ColumnKey, message: string) => {
      columnErrors.add(key);
      errors.push(`${COLUMN_LABELS[key]}: ${message}`);
    };

    // Catalog values → ids.
    const resolveCell = <T extends CatalogItem>(key: ColumnKey, lookup: Lookup<T>): T | null => {
      const value = cell(key);
      if (value === "") return null;
      const result = resolve(lookup, value);
      if ("error" in result) {
        addError(key, result.error);
        return null;
      }
      return result.item;
    };
    const category = resolveCell("category", lookups.categories);
    const unit = resolveCell("unit", lookups.units);
    const location = resolveCell("location", lookups.locations);
    const supplier = resolveCell("supplier", lookups.suppliers);

    const tracksRemnants = parseYesNo(cell("tracksRemnants"));
    if (tracksRemnants === null) addError("tracksRemnants", 'Escriba "Sí" o "No".');

    const minStock = cell("minStock");
    const values: CreateMaterialFormValues = {
      sku: cell("sku"),
      name: cell("name"),
      description: cell("description"),
      categoryId: category?.id ?? "",
      baseUnitId: unit?.id ?? "",
      minStock: minStock === "" ? "0" : normalizeNumber(minStock, delimiter),
      maxStock: normalizeNumber(cell("maxStock"), delimiter),
      locationId: location?.id ?? "",
      primarySupplierId: supplier?.id ?? "",
      tracksRemnants: tracksRemnants ?? false,
      openingQuantity: normalizeNumber(cell("openingQuantity"), delimiter),
      openingUnitCost: normalizeNumber(cell("openingUnitCost"), delimiter),
    };

    // Same rules as the form; catalog cells already reported keep one message.
    const parsed = createMaterialSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors as Partial<
        Record<keyof CreateMaterialFormValues, string[]>
      >;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const key = SCHEMA_FIELD_COLUMN[field as keyof CreateMaterialFormValues];
        const [message] = messages ?? [];
        if (!key || !message || columnErrors.has(key)) continue;
        const required = IMPORT_COLUMNS.some((column) => column.key === key && column.required);
        addError(key, required && cell(key) === "" ? "Falta el valor." : message);
      }
    }

    if (unit && values.openingQuantity && exceedsDecimals(values.openingQuantity, unit.decimals)) {
      const hint = decimalsHint(unit.decimals);
      addError(
        "openingQuantity",
        `${hint.charAt(0).toUpperCase()}${hint.slice(1)} (${unit.symbol}).`,
      );
    }

    // Duplicates against the catalog and within the file.
    const sku = parsed.success ? parsed.data.sku : null;
    if (sku) {
      if (existingSkus.has(sku)) addError("sku", `Ya existe un material con el código ${sku}.`);
      else if (fileSkus.has(sku)) addError("sku", `Repetido (fila ${fileSkus.get(sku)}).`);
      else fileSkus.set(sku, line);
    }
    const nameKey = normalizeForSearch(values.name);
    if (nameKey) {
      const existing = existingNames.get(nameKey);
      if (existing) addError("name", `Ya existe un material con este nombre (${existing}).`);
      else if (fileNames.has(nameKey))
        addError("name", `Repetido (fila ${fileNames.get(nameKey)}).`);
      else fileNames.set(nameKey, line);
    }

    previewRows.push({
      line,
      sku: sku ?? cell("sku").toUpperCase(),
      name: cell("name"),
      category: category?.name ?? cell("category"),
      unit: unit?.symbol ?? cell("unit"),
      openingQuantity: parsed.success ? parsed.data.openingQuantity : null,
      openingUnitCost: parsed.success ? parsed.data.openingUnitCost : null,
      errors,
    });

    if (parsed.success && errors.length === 0) {
      const input = parsed.data;
      materials.push({
        line,
        sku: input.sku,
        name: input.name,
        description: input.description,
        category_id: input.categoryId,
        base_unit_id: input.baseUnitId,
        min_stock: input.minStock,
        max_stock: input.maxStock,
        location_id: input.locationId,
        primary_supplier_id: input.primarySupplierId,
        tracks_remnants: input.tracksRemnants,
        opening_quantity: input.openingQuantity,
        opening_unit_cost: input.openingUnitCost,
      });
    }
  }

  return { fileErrors, ignoredColumns, rows: previewRows, materials };
}

/** Headers for the downloadable template, in the order above. */
export function importTemplateHeaders(): string[] {
  return IMPORT_COLUMNS.map((column) => (column.required ? `${column.label} *` : column.label));
}
