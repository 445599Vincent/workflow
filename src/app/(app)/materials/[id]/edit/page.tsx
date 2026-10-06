import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { MaterialForm } from "@/features/materials/components/material-form";
import { getMaterialForEdit, getMaterialFormOptions } from "@/features/materials/queries";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Editar material" };

/** Numbers are edited as text; avoid "30.0000" from numeric columns. */
function toInputValue(value: number | null) {
  return value === null ? "" : String(Number(value));
}

export default async function EditMaterialPage({ params }: PageProps<"/materials/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  await requirePermission("materials.manage");
  const [material, options] = await Promise.all([getMaterialForEdit(id), getMaterialFormOptions()]);
  if (!material) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/materials/${id}`} className="hover:text-foreground">
            ← {material.name}
          </Link>
        }
        title="Editar material"
        description="El stock y los costos no se editan aquí: cambian solo con entradas, consumos y ajustes."
      />
      <MaterialForm
        mode="edit"
        materialId={id}
        sku={material.sku}
        hasMovements={material.hasMovements}
        options={options}
        defaultValues={{
          sku: material.sku,
          name: material.name,
          description: material.description ?? "",
          categoryId: material.category_id,
          baseUnitId: material.base_unit_id,
          minStock: toInputValue(material.min_stock),
          maxStock: toInputValue(material.max_stock),
          locationId: material.location_id ?? "",
          primarySupplierId: material.primary_supplier_id ?? "",
          tracksRemnants: material.tracks_remnants,
          openingQuantity: "",
          openingUnitCost: "",
          isActive: material.is_active,
        }}
      />
    </div>
  );
}
