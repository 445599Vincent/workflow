import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { AdjustmentForm } from "@/features/inventory/components/adjustment-form";
import { listMaterialOptions } from "@/features/materials/queries";
import { can, requirePermission } from "@/lib/auth/session";
import { firstParam } from "@/lib/url";

export const metadata: Metadata = { title: "Ajuste de inventario" };

export default async function AdjustmentPage({ searchParams }: PageProps<"/movements/adjust">) {
  const user = await requirePermission("inventory.adjust");
  const params = await searchParams;
  const materials = await listMaterialOptions();
  const material = materials.find((item) => item.id === firstParam(params.material));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={material ? `/materials/${material.id}` : "/movements"}
            className="hover:text-foreground"
          >
            ← {material ? material.name : "Movimientos"}
          </Link>
        }
        title="Ajuste de inventario"
        description="Corrige el stock físico con un motivo. Queda en el kardex y en la auditoría; no se puede borrar."
      />
      <AdjustmentForm
        materials={materials}
        canAllowNegative={can(user, "inventory.allow_negative")}
        defaultValues={{
          materialId: material?.id ?? "",
          direction: "out",
          quantity: "",
          reason: "physical_count",
          unitCost: material && material.avgCost > 0 ? String(material.avgCost) : "",
          notes: "",
          allowNegative: false,
        }}
      />
    </div>
  );
}
