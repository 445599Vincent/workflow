import { ActiveBadge } from "@/components/shared/active-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RoleOption, UserRow } from "../queries";
import { EditUserDialog } from "./edit-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

type UsersTableProps = {
  rows: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
  canResetPasswords: boolean;
};

function StatusBadges({ row }: { row: UserRow }) {
  return (
    <>
      <ActiveBadge active={row.is_active} />
      {row.must_change_password && <Badge variant="warning">Contraseña temporal</Badge>}
    </>
  );
}

export function UsersTable({ rows, roles, currentUserId, canResetPasswords }: UsersTableProps) {
  const roleName = (code: string) => roles.find((role) => role.code === code)?.name ?? code;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Usuario</TableHead>
          <TableHead className="hidden sm:table-cell">Rol</TableHead>
          <TableHead className="hidden sm:table-cell">Estado</TableHead>
          <TableHead className="w-24 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isSelf = row.id === currentUserId;
          return (
            <TableRow key={row.id} className={cn(!row.is_active && "text-muted-foreground")}>
              <TableCell className="max-w-56 sm:max-w-72">
                <p className="truncate font-medium">
                  {row.full_name || row.email}
                  {isSelf && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(usted)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={row.email}>
                  {row.email}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <span className="text-xs font-medium">{roleName(row.role_code)}</span>
                  <StatusBadges row={row} />
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={row.role_code === "admin" ? "info" : "secondary"}>
                  {roleName(row.role_code)}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="flex flex-wrap items-center gap-1.5">
                  <StatusBadges row={row} />
                </span>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <EditUserDialog user={row} roles={roles} isSelf={isSelf} />
                  {canResetPasswords && !isSelf && <ResetPasswordDialog user={row} />}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
