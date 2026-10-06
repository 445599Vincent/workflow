import Link from "next/link";
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
import type { CustomerRow } from "../queries";
import { CustomerDialog } from "./customer-dialog";

export function CustomersTable({ rows, canManage }: { rows: CustomerRow[]; canManage: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden md:table-cell">Contacto</TableHead>
          <TableHead className="text-right">Órdenes</TableHead>
          <TableHead className="hidden sm:table-cell">Estado</TableHead>
          {canManage && <TableHead className="w-12" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
            <TableCell className="max-w-64">
              <p className="truncate font-medium">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[row.code, row.tax_id && `RNC ${row.tax_id}`].filter(Boolean).join(" · ") || "—"}
              </p>
            </TableCell>
            <TableCell className="hidden max-w-56 md:table-cell">
              <p className="truncate">{row.contact_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[row.phone, row.email].filter(Boolean).join(" · ")}
              </p>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.orderCount > 0 ? (
                <Link
                  href={`/work-orders?customer=${row.id}&status=all`}
                  className="text-primary hover:underline"
                >
                  {row.orderCount}
                </Link>
              ) : (
                0
              )}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <ActiveBadge active={row.is_active} />
            </TableCell>
            {canManage && (
              <TableCell>
                <CustomerDialog
                  customer={row}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${row.name}`}>
                      <PencilIcon />
                    </Button>
                  }
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
