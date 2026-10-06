import Link from "next/link";

import { ActiveBadge } from "@/components/shared/active-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SupplierListRow } from "../queries";

export function SuppliersTable({ rows }: { rows: SupplierListRow[] }) {
  return (
    <>
      {/* Phones */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/suppliers/${row.id}`} className="block px-4 py-3 active:bg-muted/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[row.code, row.tax_id && `RNC ${row.tax_id}`].filter(Boolean).join(" · ") ||
                      "Sin código"}
                  </p>
                </div>
                <ActiveBadge active={row.is_active} />
              </div>
              {(row.contact_name || row.phone) && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[row.contact_name, row.phone].filter(Boolean).join(" · ")}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Código</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="hidden lg:table-cell">RNC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="hidden xl:table-cell">Correo</TableHead>
              <TableHead className="text-right">Materiales</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
                <TableCell className="font-mono text-xs">{row.code ?? "—"}</TableCell>
                <TableCell className="max-w-64 truncate font-medium">
                  <Link
                    href={`/suppliers/${row.id}`}
                    title={row.name}
                    className="hover:text-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {row.tax_id ?? "—"}
                </TableCell>
                <TableCell className="max-w-56 truncate">
                  {row.contact_name ?? "—"}
                  {row.phone && (
                    <span className="block text-xs text-muted-foreground">{row.phone}</span>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-56 truncate text-muted-foreground xl:table-cell">
                  {row.email ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.materialCount}</TableCell>
                <TableCell>
                  <ActiveBadge active={row.is_active} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
