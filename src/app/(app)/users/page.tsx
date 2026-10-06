import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { CreateUserDialog } from "@/features/users/components/create-user-dialog";
import { UsersTable } from "@/features/users/components/users-table";
import { listRoles, listUsers } from "@/features/users/queries";
import { requirePermission } from "@/lib/auth/session";
import { isAdminAuthConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const user = await requirePermission("users.manage");
  const [rows, roles] = await Promise.all([listUsers(), listRoles()]);
  const adminConfigured = isAdminAuthConfigured();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Usuarios"
        description="Quién puede ingresar a Workflow y qué puede hacer. Los usuarios no se borran: se desactivan."
        actions={<CreateUserDialog roles={roles} disabled={!adminConfigured} />}
      />

      {!adminConfigured && (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Creación de usuarios no configurada</AlertTitle>
          <AlertDescription>
            <p>
              Puede cambiar roles y activar o desactivar usuarios. Para crear usuarios y restablecer
              contraseñas desde aquí, agregue la variable <code>SUPABASE_SERVICE_ROLE_KEY</code> en
              Vercel (Supabase → Project Settings → API Keys → <em>secret</em>) y vuelva a
              desplegar.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <UsersTable
          rows={rows}
          roles={roles}
          currentUserId={user.id}
          canResetPasswords={adminConfigured}
        />
      </Card>

      <p className="text-xs text-muted-foreground">
        Roles: <strong>Administrador</strong> (todo), <strong>Supervisor</strong> (catálogos,
        ajustes, anulaciones, órdenes), <strong>Almacén</strong> (materiales, proveedores,
        entradas), <strong>Producción</strong> (consumos y mermas) y <strong>Consulta</strong> (solo
        lectura).
      </p>
    </div>
  );
}
