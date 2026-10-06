import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { MaterialForm } from "@/features/materials/components/material-form";
import { getMaterialFormOptions } from "@/features/materials/queries";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nuevo material" };

export default async function NewMaterialPage() {
  await requirePermission("materials.manage");
  const options = await getMaterialFormOptions();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/materials" className="hover:text-foreground">
            ← Materias primas
          </Link>
        }
        title="Nuevo material"
        description="Los campos marcados con * son obligatorios."
      />
      <MaterialForm
        mode="create"
        options={options}
        defaultValues={{
          sku: "",
          name: "",
          description: "",
          categoryId: "",
          baseUnitId: "",
          minStock: "0",
          maxStock: "",
          locationId: "",
          primarySupplierId: "",
          tracksRemnants: false,
          openingQuantity: "",
          openingUnitCost: "",
          isActive: true,
        }}
      />
    </div>
  );
}
