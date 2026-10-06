"use client";

import { useRef, useState, useTransition } from "react";
import { CircleAlertIcon, CircleCheckIcon, FileUpIcon, LoaderCircleIcon } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatQuantity } from "@/lib/format";
import { importMaterials, previewMaterialImport, type MaterialImportPreview } from "../actions";
import { MAX_IMPORT_BYTES } from "../import";

/** Rows listed on screen; the summary always counts the whole file. */
const PREVIEW_LIMIT = 100;

/**
 * Excel's "CSV UTF-8" is UTF-8; its plain "CSV" uses the Windows code page.
 * Try strict UTF-8 first so accents survive either way.
 */
async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function MaterialImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<MaterialImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const [importing, startImporting] = useTransition();

  function reset() {
    setFileName(null);
    setText(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    if (file.size > MAX_IMPORT_BYTES) {
      setError("El archivo es demasiado grande. Divídalo en varios archivos.");
      return;
    }
    const content = await readCsvFile(file);
    setText(content);
    startChecking(async () => {
      const result = await previewMaterialImport(content);
      if (result.ok) setPreview(result.data);
      else setError(result.error);
    });
  }

  function onImport() {
    if (!text) return;
    setError(null);
    startImporting(async () => {
      // Redirects to the materials list on success.
      const result = await importMaterials(text);
      if (result && !result.ok) setError(result.error);
    });
  }

  const rows = preview?.rows ?? [];
  const withErrors = rows.filter((row) => row.errors.length > 0);
  const withStock = rows.filter((row) => (row.openingQuantity ?? 0) > 0);
  const openingValue = withStock.reduce(
    (sum, row) => sum + (row.openingQuantity ?? 0) * (row.openingUnitCost ?? 0),
    0,
  );
  const canImport =
    preview !== null && preview.fileErrors.length === 0 && rows.length > 0 && !withErrors.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Cargue el archivo</CardTitle>
        <CardDescription>
          Se muestra una vista previa con los errores de cada fila. Si alguna fila tiene errores no
          se importa nada: corrija el archivo y vuelva a cargarlo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={onFileChange}
            disabled={checking || importing}
          />
          <Button asChild variant={preview ? "outline" : "default"}>
            <label htmlFor="import-file" className="cursor-pointer">
              <FileUpIcon />
              {fileName ? "Elegir otro archivo" : "Elegir archivo CSV"}
            </label>
          </Button>
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          {checking && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Revisando el archivo…
            </span>
          )}
        </div>

        <FormError message={error} />

        {preview && preview.fileErrors.length > 0 && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se puede leer el archivo</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {preview.fileErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {preview && preview.ignoredColumns.length > 0 && (
          <Alert variant="warning">
            <CircleAlertIcon />
            <AlertTitle>Columnas ignoradas</AlertTitle>
            <AlertDescription>
              No se reconocen y no se importarán: {preview.ignoredColumns.join(", ")}.
            </AlertDescription>
          </Alert>
        )}

        {rows.length > 0 && (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Summary label="Materiales" value={rows.length.toLocaleString("es-DO")} />
              <Summary
                label="Con errores"
                value={withErrors.length.toLocaleString("es-DO")}
                tone={withErrors.length > 0 ? "destructive" : undefined}
              />
              <Summary
                label="Con existencia inicial"
                value={withStock.length.toLocaleString("es-DO")}
              />
              <Summary label="Valor inicial" value={formatMoney(openingValue)} />
            </dl>

            {withErrors.length > 0 ? (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>
                  Corrija {withErrors.length === 1 ? "1 fila" : `${withErrors.length} filas`} antes
                  de importar
                </AlertTitle>
                <AlertDescription>
                  <ul className="space-y-1">
                    {withErrors.slice(0, PREVIEW_LIMIT).map((row) => (
                      <li key={row.line}>
                        <strong>Fila {row.line}</strong>
                        {row.name && ` · ${row.name}`}: {row.errors.join(" · ")}
                      </li>
                    ))}
                  </ul>
                  {withErrors.length > PREVIEW_LIMIT && (
                    <p className="mt-2">
                      …y {withErrors.length - PREVIEW_LIMIT} filas más con errores.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="info">
                <CircleCheckIcon />
                <AlertTitle>El archivo está listo</AlertTitle>
                <AlertDescription>
                  Se crearán {rows.length} materiales en una sola operación.
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Existencia inicial</TableHead>
                    <TableHead className="text-right">Costo unitario</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Estado</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, PREVIEW_LIMIT).map((row) => (
                    <TableRow key={row.line}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {row.line}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.sku || <span className="text-muted-foreground">Automático</span>}
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.openingQuantity ? formatQuantity(row.openingQuantity) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.openingUnitCost !== null ? formatMoney(row.openingUnitCost) : "—"}
                      </TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <CircleAlertIcon
                            className="size-4 text-destructive"
                            aria-label="Con errores"
                          />
                        ) : (
                          <CircleCheckIcon className="size-4 text-success" aria-label="Correcta" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > PREVIEW_LIMIT && (
              <p className="text-sm text-muted-foreground">
                Se muestran las primeras {PREVIEW_LIMIT} filas de {rows.length}.
              </p>
            )}
          </>
        )}

        {preview && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={reset} disabled={importing}>
              Cancelar
            </Button>
            <SubmitButton
              type="button"
              onClick={onImport}
              disabled={!canImport}
              pending={importing}
              pendingText="Importando…"
            >
              Importar {rows.length > 0 ? `${rows.length} materiales` : ""}
            </SubmitButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "destructive"
            ? "text-lg font-semibold text-destructive tabular-nums"
            : "text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
