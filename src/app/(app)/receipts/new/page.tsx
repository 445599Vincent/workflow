import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReceiptForm } from "@/features/receipts/components/receipt-form";
import { getReceiptFormOptions } from "@/features/receipts/queries";
import { EMPTY_RECEIPT_LINE, type ReceiptFormValues } from "@/features/receipts/schemas";
import { requirePermission } from "@/lib/auth/session";
import { todayISODate } from "@/lib/format";
import { firstParam } from "@/lib/url";

export const metadata: Metadata = { title: "Nueva entrada" };

export default async function NewReceiptPage({ searchParams }: PageProps<"/receipts/new">) {
  await requirePermission("inventory.receive");
  const params = await searchParams;
  const options = await getReceiptFormOptions();

  // Shortcuts from a supplier (?supplier=) or a material (?material=) page.
  const supplierId = firstParam(params.supplier);
  const material = options.materials.find((item) => item.id === firstParam(params.material));

  const defaultValues: ReceiptFormValues = {
    receiptDate: todayISODate(),
    supplierId: options.suppliers.some((item) => item.id === supplierId) ? (supplierId ?? "") : "",
    invoiceNumber: "",
    notes: "",
    lines: [
      material
        ? {
            materialId: material.id,
            quantity: "",
            unitCost: material.lastCost > 0 ? String(material.lastCost) : "",
          }
        : { ...EMPTY_RECEIPT_LINE },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/receipts" className="hover:text-foreground">
            ← Compras / Entradas
          </Link>
        }
        title="Nueva entrada"
        description="Registre lo que llegó al almacén. Al guardar, el inventario aumenta de inmediato."
      />
      {options.materials.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageIcon}
            title="No hay materiales activos"
            description="Cree primero los materiales que va a recibir."
            action={
              <Button asChild>
                <Link href="/materials/new">Crear material</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ReceiptForm options={options} defaultValues={defaultValues} />
      )}
    </div>
  );
}
