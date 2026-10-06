import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageIcon, PackagePlusIcon, PencilIcon, ReceiptTextIcon } from "lucide-react";
import { z } from "zod";

import { ActiveBadge } from "@/components/shared/active-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockStatusBadge } from "@/features/materials/components/stock-status-badge";
import {
  getSupplier,
  getSupplierMaterials,
  getSupplierReceipts,
  SUPPLIER_RECENT_RECEIPTS,
} from "@/features/suppliers/queries";
import { can, requireUser } from "@/lib/auth/session";
import { formatDateTime, formatMoney, formatPlainDate, formatQuantityWithUnit } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/suppliers/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Proveedor" };
  const supplier = await getSupplier(id);
  return { title: supplier?.name ?? "Proveedor" };
}

export default async function SupplierPage({ params }: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  const [supplier, materials, receipts] = await Promise.all([
    getSupplier(id),
    getSupplierMaterials(id),
    getSupplierReceipts(id),
  ]);
  if (!supplier) notFound();

  const details: [string, React.ReactNode][] = [
    ["RNC / Cédula", supplier.tax_id ?? "—"],
    ["Contacto", supplier.contact_name ?? "—"],
    [
      "Teléfono",
      supplier.phone ? (
        <a href={`tel:${supplier.phone}`} className="text-primary hover:underline">
          {supplier.phone}
        </a>
      ) : (
        "—"
      ),
    ],
    [
      "Correo",
      supplier.email ? (
        <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
          {supplier.email}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Dirección", supplier.address ?? "—"],
    ["Creado", formatDateTime(supplier.created_at)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/suppliers" className="hover:text-foreground">
            ← Proveedores
          </Link>
        }
        title={supplier.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {supplier.code && <span className="font-mono">{supplier.code}</span>}
            <ActiveBadge active={supplier.is_active} />
          </span>
        }
        actions={
          <>
            {can(user, "inventory.receive") && supplier.is_active && (
              <Button asChild>
                <Link href={`/receipts/new?supplier=${id}`}>
                  <PackagePlusIcon />
                  Registrar entrada
                </Link>
              </Button>
            )}
            {can(user, "suppliers.manage") && (
              <Button variant="outline" asChild>
                <Link href={`/suppliers/${id}/edit`}>
                  <PencilIcon />
                  Editar
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
            {supplier.notes && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {supplier.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Entradas recientes</CardTitle>
            <CardDescription>
              Últimas {SUPPLIER_RECENT_RECEIPTS} compras registradas
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/receipts?supplier=${id}`}>Ver todas</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="border-t px-0">
            {receipts.length === 0 ? (
              <EmptyState
                icon={ReceiptTextIcon}
                title="Sin entradas registradas"
                className="py-8"
              />
            ) : (
              <ul className="divide-y">
                {receipts.map((receipt) => (
                  <li key={receipt.id}>
                    <Link
                      href={`/receipts/${receipt.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          <span className="font-mono">{receipt.number}</span>
                          {receipt.invoice_number && (
                            <span className="text-muted-foreground">
                              {" "}
                              · Factura {receipt.invoice_number}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPlainDate(receipt.receipt_date)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {receipt.voided_at && <Badge variant="destructive">Anulada</Badge>}
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(receipt.total_cost)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Materiales de este proveedor</CardTitle>
          <CardDescription>Materiales que lo tienen como proveedor principal</CardDescription>
        </CardHeader>
        <CardContent className="border-t px-0">
          {materials.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="Ningún material lo tiene como proveedor principal"
              description="Se asigna desde el formulario de cada material."
              className="py-8"
            />
          ) : (
            <ul className="divide-y">
              {materials.map((material) => (
                <li key={material.id}>
                  <Link
                    href={`/materials/${material.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium"
                        title={material.name ?? undefined}
                      >
                        {material.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {material.sku} · Último costo {formatMoney(material.last_cost)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums">
                        {formatQuantityWithUnit(
                          material.stock_available,
                          material.unit_symbol,
                          material.unit_decimals ?? 4,
                        )}
                      </span>
                      <StockStatusBadge status={material.stock_status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
