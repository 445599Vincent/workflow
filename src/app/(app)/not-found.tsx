import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppNotFound() {
  return (
    <Card>
      <EmptyState
        icon={SearchXIcon}
        title="No encontramos lo que busca"
        description="El registro no existe o no tiene acceso a él."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
        }
      />
    </Card>
  );
}
