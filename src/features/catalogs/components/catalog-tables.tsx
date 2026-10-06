import { PencilIcon } from "lucide-react";

import { ActiveBadge } from "@/components/shared/active-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CategoryRow, LocationRow, UnitRow } from "../queries";
import { UNIT_KINDS } from "../schemas";
import { CategoryDialog } from "./category-dialog";
import { LocationDialog } from "./location-dialog";
import { UnitDialog } from "./unit-dialog";

function EditButton({ label }: { label: string }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label}>
      <PencilIcon />
    </Button>
  );
}

function MaterialsCell({ count }: { count: number }) {
  return <TableCell className="text-right tabular-nums">{count}</TableCell>;
}

export function CategoriesTable({ rows, canManage }: { rows: CategoryRow[]; canManage: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-16">Orden</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead className="text-right">Materiales</TableHead>
          <TableHead>Estado</TableHead>
          {canManage && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
            <TableCell className="tabular-nums">{row.sort_order}</TableCell>
            <TableCell className="max-w-96 whitespace-normal">
              <p className="font-medium">{row.name}</p>
              {row.description && (
                <p className="text-xs text-muted-foreground">{row.description}</p>
              )}
            </TableCell>
            <MaterialsCell count={row.materialCount} />
            <TableCell>
              <ActiveBadge active={row.is_active} />
            </TableCell>
            {canManage && (
              <TableCell>
                <CategoryDialog
                  category={row}
                  trigger={<EditButton label={`Editar ${row.name}`} />}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function UnitsTable({ rows, canManage }: { rows: UnitRow[]; canManage: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Unidad</TableHead>
          <TableHead>Símbolo</TableHead>
          <TableHead className="hidden sm:table-cell">Tipo</TableHead>
          <TableHead className="text-right">Decimales</TableHead>
          <TableHead className="text-right">Materiales</TableHead>
          <TableHead>Estado</TableHead>
          {canManage && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
            <TableCell>
              <p className="font-medium">{row.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{row.code}</p>
            </TableCell>
            <TableCell>{row.symbol}</TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">
              {UNIT_KINDS[row.kind].split(" (")[0]}
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.decimals}</TableCell>
            <MaterialsCell count={row.materialCount} />
            <TableCell>
              <ActiveBadge active={row.is_active} />
            </TableCell>
            {canManage && (
              <TableCell>
                <UnitDialog unit={row} trigger={<EditButton label={`Editar ${row.name}`} />} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LocationsTable({ rows, canManage }: { rows: LocationRow[]; canManage: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Código</TableHead>
          <TableHead>Ubicación</TableHead>
          <TableHead className="text-right">Materiales</TableHead>
          <TableHead>Estado</TableHead>
          {canManage && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
            <TableCell className="font-mono text-xs">{row.code}</TableCell>
            <TableCell className="max-w-96 whitespace-normal">
              <p className="font-medium">{row.name}</p>
              {row.description && (
                <p className="text-xs text-muted-foreground">{row.description}</p>
              )}
            </TableCell>
            <MaterialsCell count={row.materialCount} />
            <TableCell>
              <ActiveBadge active={row.is_active} />
            </TableCell>
            {canManage && (
              <TableCell>
                <LocationDialog
                  location={row}
                  trigger={<EditButton label={`Editar ${row.name}`} />}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
