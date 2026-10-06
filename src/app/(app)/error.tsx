"use client";

import { useEffect } from "react";
import { TriangleAlertIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <EmptyState
        icon={TriangleAlertIcon}
        title="No se pudo cargar esta página"
        description="Ocurrió un problema al consultar los datos. Verifique su conexión e intente de nuevo."
        action={<Button onClick={reset}>Reintentar</Button>}
      />
    </Card>
  );
}
