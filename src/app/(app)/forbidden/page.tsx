import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Acceso restringido" };

export default function ForbiddenPage() {
  return (
    <Card>
      <EmptyState
        icon={ShieldAlertIcon}
        title="No tiene acceso a esta sección"
        description="Su rol no incluye el permiso necesario. Si cree que es un error, contacte a un administrador."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
        }
      />
    </Card>
  );
}
