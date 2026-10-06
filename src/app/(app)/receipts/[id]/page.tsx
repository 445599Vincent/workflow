import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanIcon } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptLinesTable } from "@/features/receipts/components/receipt-lines-table";
import { ReceiptStatusBadge } from "@/features/receipts/components/receipt-status-badge";
import { VoidReceiptDialog } from "@/features/receipts/components/void-receipt-dialog";
import { getReceipt, getReceiptLines } from "@/features/receipts/queries";
import { can, requireUser } from "@/lib/auth/session";
import { formatDateTime, formatPlainDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/receipts/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Entrada" };
  const receipt = await getReceipt(id);
  return { title: receipt?.number ?? "Entrada" };
}

export default async function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  const [receipt, lines] = await Promise.all([getReceipt(id), getReceiptLines(id)]);
  if (!receipt) notFound();
  const voided = Boolean(receipt.voided_at);

  const details: [string, React.ReactNode][] = [
    ["Fecha", formatPlainDate(receipt.receipt_date)],
    [
      "Proveedor",
      receipt.supplier ? (
        <Link href={`/suppliers/${receipt.supplier.id}`} className="text-primary hover:underline">
          {receipt.supplier.name}
        </Link>
      ) : (
        "—"
      ),
    ],
    ["Factura", receipt.invoice_number ?? "—"],
    ["Registrada por", receipt.creator?.full_name ?? "—"],
    ["Registrada el", formatDateTime(receipt.created_at)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/receipts" className="hover:text-foreground">
            ← Compras / Entradas
          </Link>
        }
        title={`Entrada ${receipt.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatPlainDate(receipt.receipt_date)}</span>
            <ReceiptStatusBadge voided={voided} />
          </span>
        }
        actions={
          !voided &&
          can(user, "inventory.void") && (
            <VoidReceiptDialog receiptId={id} number={receipt.number} />
          )
        }
      />

      {voided && (
        <Alert variant="destructive">
          <BanIcon />
          <AlertTitle>Entrada anulada</AlertTitle>
          <AlertDescription>
            <p>
              {receipt.voider?.full_name ?? "Un usuario"} la anuló el{" "}
              {formatDateTime(receipt.voided_at)}. Motivo: {receipt.void_reason}
            </p>
            <p>Las cantidades se descontaron del inventario con movimientos de reverso.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {receipt.notes && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {receipt.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Materiales</CardTitle>
          </CardHeader>
          <CardContent className="border-t px-0">
            <ReceiptLinesTable lines={lines} total={receipt.total_cost} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
