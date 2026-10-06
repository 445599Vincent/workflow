import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UnitsTable } from "@/features/catalogs/components/catalog-tables";
import { UnitDialog } from "@/features/catalogs/components/unit-dialog";
import { listUnits } from "@/features/catalogs/queries";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Unidades de medida" };

export default async function Page() {
  const user = await requireUser();
  const rows = await listUnits();
  const canManage = can(user, "catalog.manage");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/settings" className="hover:text-foreground">
            ← Configuración
          </Link>
        }
        title="Unidades de medida"
        description="Unidad en que se controla el inventario de cada material y cuántos decimales admite."
        actions={
          canManage && (
            <UnitDialog
              trigger={
                <Button>
                  <PlusIcon />
                  Nueva unidad
                </Button>
              }
            />
          )
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <UnitsTable rows={rows} canManage={canManage} />
      </Card>
    </div>
  );
}
