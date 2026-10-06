import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
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
import { MaterialImport } from "@/features/materials/components/material-import";
import { IMPORT_COLUMNS, MAX_IMPORT_ROWS } from "@/features/materials/import";
import { getMaterialFormOptions } from "@/features/materials/queries";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Importar materiales" };

export default async function ImportMaterialsPage() {
  await requirePermission("materials.manage");
  const options = await getMaterialFormOptions();
  const categories = options.categories.filter((item) => item.is_active).map((item) => item.name);
  const units = options.units
    .filter((item) => item.is_active)
    .map((item) => `${item.code} (${item.name.toLowerCase()})`);
  const locations = options.locations.filter((item) => item.is_active).map((item) => item.code);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/materials" className="hover:text-foreground">
            ← Materias primas
          </Link>
        }
        title="Importar materiales"
        description="Cargue el catálogo inicial desde Excel. El archivo se revisa completo antes de crear nada."
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Prepare el archivo</CardTitle>
          <CardDescription>
            Descargue la plantilla, complete una fila por material y guárdela en Excel como{" "}
            <strong>CSV UTF-8 (delimitado por comas)</strong>. Hasta {MAX_IMPORT_ROWS} materiales
            por archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button asChild variant="outline">
            <a href="/materials/import/template" download>
              <DownloadIcon />
              Descargar plantilla
            </a>
          </Button>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna</TableHead>
                  <TableHead>Qué escribir</TableHead>
                  <TableHead>Ejemplo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {IMPORT_COLUMNS.map((column) => (
                  <TableRow key={column.key}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {column.label} {column.required && <Badge variant="info">Obligatoria</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{column.help}</TableCell>
                    <TableCell className="whitespace-nowrap">{column.example || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <ValidValues label="Categorías" values={categories} />
            <ValidValues label="Unidades" values={units} />
            <ValidValues label="Ubicaciones" values={locations} />
          </dl>
          <p className="text-sm text-muted-foreground">
            Use punto para los decimales (12.5). Si su Excel guarda el CSV con punto y coma, también
            se acepta la coma decimal (12,5). La existencia inicial queda registrada como ajuste
            &quot;Inventario inicial&quot;, igual que al crear un material a mano.
          </p>
        </CardContent>
      </Card>

      <MaterialImport />
    </div>
  );
}

function ValidValues({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="space-y-1">
      <dt className="font-medium">{label}</dt>
      <dd className="text-muted-foreground">
        {values.length > 0 ? values.join(", ") : "Ninguna activa (créelas en Configuración)."}
      </dd>
    </div>
  );
}
