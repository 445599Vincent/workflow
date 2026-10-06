import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LocationsTable } from "@/features/catalogs/components/catalog-tables";
import { LocationDialog } from "@/features/catalogs/components/location-dialog";
import { listLocations } from "@/features/catalogs/queries";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ubicaciones" };

export default async function Page() {
  const user = await requireUser();
  const rows = await listLocations();
  const canManage = can(user, "catalog.manage");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/settings" className="hover:text-foreground">
            ← Configuración
          </Link>
        }
        title="Ubicaciones"
        description="Lugares del almacén donde se guarda cada material (estantes, racks, patio)."
        actions={
          canManage && (
            <LocationDialog
              trigger={
                <Button>
                  <PlusIcon />
                  Nueva ubicación
                </Button>
              }
            />
          )
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <LocationsTable rows={rows} canManage={canManage} />
      </Card>
    </div>
  );
}
