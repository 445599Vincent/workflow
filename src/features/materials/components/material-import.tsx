"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CircleAlertIcon,
  DownloadIcon,
  FileUpIcon,
  LoaderCircleIcon,
  UploadIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseCsv } from "@/lib/csv-parse";
import { formatMoney, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import { importMaterials } from "../actions";
import { IMPORT_MAX_ROWS, prepareImport, type ImportRow } from "../import";
import type { ImportCatalogs } from "../queries";

type CheckedRow = { number: number; row: ImportRow; errors: string[]; notes: string[] };

const lower = (value: string) => value.trim().toLocaleLowerCase("es");

/** Decimal places written in the file (string based: 0.1 × 100 is not exactly 10). */
const decimalsOf = (value: number) => (String(value).split(".")[1] ?? "").length;

/** Checks a prepared file against the catalogs, like the database will (IMP-05). */
function checkRows(
  rows: ImportRow[],
  readErrors: Map<number, string[]>,
  catalogs: ImportCatalogs,
  createCatalogs: boolean,
): CheckedRow[] {
  const categories = new Set(catalogs.categories.map(lower));
  const locations = new Set(catalogs.locations.map(lower));
  const suppliers = new Set(catalogs.suppliers.map(lower));
  const existingSkus = new Set(catalogs.skus.map((sku) => sku.toUpperCase()));
  const seenSkus = new Set<string>();

  return rows.map((row, index) => {
    const number = index + 2;
    const errors = [...(readErrors.get(number) ?? [])];
    const notes: string[] = [];

    const sku = row.sku?.trim().toUpperCase();
    if (sku) {
      if (seenSkus.has(sku)) errors.push(`el código ${sku} está repetido en el archivo`);
      else if (existingSkus.has(sku)) errors.push(`ya existe un material con el código ${sku}`);
      seenSkus.add(sku);
    }

    if (row.unit) {
      const unit =
        catalogs.units.find((item) => lower(item.code) === lower(row.unit)) ??
        catalogs.units.find((item) => item.symbol === row.unit.trim());
      if (!unit) errors.push(`la unidad "${row.unit}" no existe`);
      else if (row.opening_quantity !== null && decimalsOf(row.opening_quantity) > unit.decimals)
        errors.push(`la existencia admite como máximo ${unit.decimals} decimales (${unit.name})`);
    }

    if (row.category && !categories.has(lower(row.category))) {
      if (createCatalogs) notes.push(`categoría nueva: ${row.category}`);
      else errors.push(`la categoría "${row.category}" no existe`);
    }
    if (row.location && !locations.has(lower(row.location))) {
      if (createCatalogs) notes.push(`ubicación nueva: ${row.location}`);
      else errors.push(`la ubicación "${row.location}" no existe`);
    }
    if (row.supplier && !suppliers.has(lower(row.supplier))) {
      errors.push(`el proveedor "${row.supplier}" no existe`);
    }
    if ((row.opening_quantity ?? 0) > 0 && !row.opening_unit_cost) {
      errors.push("indique el costo unitario de la existencia inicial");
    }
    if (row.max_stock !== null && row.max_stock < (row.min_stock ?? 0)) {
      errors.push("el máximo es menor que el mínimo");
    }
    return { number, row, errors, notes };
  });
}

export function MaterialImport({
  catalogs,
  canCreateCatalogs,
}: {
  catalogs: ImportCatalogs;
  canCreateCatalogs: boolean;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<ReturnType<typeof prepareImport> | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [createCatalogs, setCreateCatalogs] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const checked = useMemo(
    () => (prepared ? checkRows(prepared.rows, prepared.errors, catalogs, createCatalogs) : []),
    [prepared, catalogs, createCatalogs],
  );
  const withErrors = checked.filter((item) => item.errors.length > 0).length;
  const newCatalogs = new Set(checked.flatMap((item) => item.notes)).size;
  const needsCatalogs = checked.some((item) =>
    item.errors.some((error) => /categoría|ubicación/.test(error)),
  );
  const tooMany = checked.length > IMPORT_MAX_ROWS;
  const blocked =
    !prepared ||
    prepared.missingColumns.length > 0 ||
    checked.length === 0 ||
    withErrors > 0 ||
    tooMany;
  const shown = onlyErrors ? checked.filter((item) => item.errors.length > 0) : checked;

  async function onFile(file: File | undefined) {
    setServerError(null);
    setReadError(null);
    setPrepared(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setReadError('Elija un archivo .csv. En Excel: "Archivo → Guardar como → CSV UTF-8".');
      return;
    }
    const text = await file.text();
    if (text.includes("�")) {
      setReadError(
        'El archivo no está en UTF-8. En Excel use "Guardar como → CSV UTF-8 (delimitado por comas)".',
      );
      return;
    }
    setPrepared(prepareImport(parseCsv(text)));
  }

  function onImport() {
    if (!prepared || blocked) return;
    setServerError(null);
    startTransition(async () => {
      const result = await importMaterials({ rows: prepared.rows, createCatalogs });
      if (result && !result.ok) setServerError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Prepare el archivo</CardTitle>
          <CardDescription>
            Descargue la plantilla, llénela en Excel (una fila por material) y guárdela como{" "}
            <strong>CSV UTF-8</strong>. Columnas obligatorias: nombre, categoría y unidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Button variant="outline" asChild>
            <a href="/materials/import/template" download>
              <DownloadIcon />
              Descargar plantilla
            </a>
          </Button>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>codigo</strong>: opcional; si lo deja vacío se genera automáticamente.
            </li>
            <li>
              <strong>unidad</strong>: código o símbolo de una unidad de Configuración (ej. und, m2,
              m²).
            </li>
            <li>
              <strong>existencia_inicial</strong> y <strong>costo_unitario</strong>: crean el ajuste
              &ldquo;Inventario inicial&rdquo; de cada material.
            </li>
            <li>Si una sola fila tiene error, no se importa ninguna.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Elija el archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm hover:border-primary/50 hover:bg-muted/40"
          >
            <FileUpIcon className="size-6 text-muted-foreground" />
            <span className="font-medium">{fileName ?? "Seleccionar archivo CSV"}</span>
            <span className="text-muted-foreground">
              Máximo {IMPORT_MAX_ROWS.toLocaleString("es-DO")} filas
            </span>
            <input
              id="file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>

          {readError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{readError}</AlertDescription>
            </Alert>
          )}
          {prepared && prepared.missingColumns.length > 0 && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Faltan columnas obligatorias</AlertTitle>
              <AlertDescription>
                {prepared.missingColumns.join(", ")}. Use los encabezados de la plantilla.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {prepared && prepared.missingColumns.length === 0 && (
        <Card className="gap-0 overflow-hidden pb-0">
          <CardHeader className="gap-3 pb-4">
            <CardTitle>3. Revise y confirme</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="import-summary">
              <Badge variant="secondary">{checked.length} filas</Badge>
              {withErrors > 0 ? (
                <Badge variant="destructive">{withErrors} con errores</Badge>
              ) : (
                <Badge variant="success">Sin errores</Badge>
              )}
              {newCatalogs > 0 && (
                <Badge variant="info">{newCatalogs} categorías/ubicaciones nuevas</Badge>
              )}
              {prepared.unknownColumns.length > 0 && (
                <span className="text-muted-foreground">
                  Columnas ignoradas: {prepared.unknownColumns.join(", ")}
                </span>
              )}
            </div>
            {tooMany && (
              <p className="text-sm text-destructive">
                El archivo tiene más de {IMPORT_MAX_ROWS} filas: divídalo en varios archivos.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {canCreateCatalogs && (needsCatalogs || createCatalogs) && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="createCatalogs"
                    checked={createCatalogs}
                    onCheckedChange={setCreateCatalogs}
                  />
                  <Label htmlFor="createCatalogs">
                    Crear las categorías y ubicaciones que no existan
                  </Label>
                </div>
              )}
              {withErrors > 0 && (
                <div className="flex items-center gap-2">
                  <Switch id="onlyErrors" checked={onlyErrors} onCheckedChange={setOnlyErrors} />
                  <Label htmlFor="onlyErrors">Mostrar solo filas con error</Label>
                </div>
              )}
            </div>
          </CardHeader>
          <div className="max-h-[28rem] overflow-auto border-t">
            <Table data-testid="import-preview">
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-14">Fila</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Costo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map(({ number, row, errors, notes }) => (
                  <TableRow key={number} className={cn(errors.length > 0 && "bg-destructive/5")}>
                    <TableCell className="text-muted-foreground tabular-nums">{number}</TableCell>
                    <TableCell>
                      <p className="font-medium">{row.name || "—"}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {row.sku ?? "Código automático"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{row.category || "—"}</TableCell>
                    <TableCell>{row.unit || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.opening_quantity ? formatQuantity(row.opening_quantity) : "—"}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {row.opening_unit_cost ? formatMoney(row.opening_unit_cost) : "—"}
                    </TableCell>
                    <TableCell className="min-w-48 text-sm">
                      {errors.length > 0 ? (
                        <ul className="text-destructive">
                          {errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-success">
                          Lista{notes.length > 0 ? ` · ${notes.join(" · ")}` : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 border-t px-6 py-4">
            {serverError && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>No se importó nada</AlertTitle>
                <AlertDescription className="whitespace-pre-line">{serverError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {withErrors > 0
                  ? "Corrija las filas marcadas en el archivo y vuelva a elegirlo."
                  : "Se crearán todos los materiales en una sola operación."}
              </p>
              <Button onClick={onImport} disabled={blocked || pending}>
                {pending ? <LoaderCircleIcon className="animate-spin" /> : <UploadIcon />}
                {pending ? "Importando…" : `Importar ${checked.length} materiales`}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
