import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { EMPTY_SUPPLIER_FORM } from "@/features/suppliers/schemas";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nuevo proveedor" };

export default async function NewSupplierPage() {
  await requirePermission("suppliers.manage");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/suppliers" className="hover:text-foreground">
            ← Proveedores
          </Link>
        }
        title="Nuevo proveedor"
        description="Solo el nombre es obligatorio."
      />
      <SupplierForm mode="create" defaultValues={EMPTY_SUPPLIER_FORM} />
    </div>
  );
}
