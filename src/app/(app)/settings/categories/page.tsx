import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoriesTable } from "@/features/catalogs/components/catalog-tables";
import { CategoryDialog } from "@/features/catalogs/components/category-dialog";
import { listCategories } from "@/features/catalogs/queries";
import { can, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categorías" };

export default async function Page() {
  const user = await requireUser();
  const rows = await listCategories();
  const canManage = can(user, "catalog.manage");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/settings" className="hover:text-foreground">
            ← Configuración
          </Link>
        }
        title="Categorías"
        description="Agrupan los materiales (viniles, lonas, acrílicos…). Una categoría no se borra: se desactiva."
        actions={
          canManage && (
            <CategoryDialog
              trigger={
                <Button>
                  <PlusIcon />
                  Nueva categoría
                </Button>
              }
            />
          )
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <CategoriesTable rows={rows} canManage={canManage} />
      </Card>
    </div>
  );
}
