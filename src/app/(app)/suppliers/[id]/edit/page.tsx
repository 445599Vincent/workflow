import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { getSupplier } from "@/features/suppliers/queries";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Editar proveedor" };

export default async function EditSupplierPage({ params }: PageProps<"/suppliers/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  await requirePermission("suppliers.manage");
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/suppliers/${id}`} className="hover:text-foreground">
            ← {supplier.name}
          </Link>
        }
        title="Editar proveedor"
      />
      <SupplierForm
        mode="edit"
        supplierId={id}
        defaultValues={{
          code: supplier.code ?? "",
          name: supplier.name,
          taxId: supplier.tax_id ?? "",
          contactName: supplier.contact_name ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          notes: supplier.notes ?? "",
          isActive: supplier.is_active,
        }}
      />
    </div>
  );
}
