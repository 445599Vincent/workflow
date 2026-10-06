/**
 * Permission codes. The database (role_permissions + has_permission()) is the
 * source of truth and enforces them through RLS and RPC checks; the UI uses
 * them only to hide actions the user cannot perform.
 */
export const PERMISSIONS = [
  "catalog.manage",
  "materials.manage",
  "suppliers.manage",
  "customers.manage",
  "inventory.receive",
  "inventory.adjust",
  "inventory.void",
  "inventory.allow_negative",
  "work_orders.manage",
  "work_orders.reserve",
  "work_orders.consume",
  "work_orders.close",
  "work_orders.reopen",
  "audit.view",
  "users.manage",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type RoleCode = "admin" | "supervisor" | "warehouse" | "production" | "viewer";

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  warehouse: "Almacén",
  production: "Producción",
  viewer: "Consulta",
};

export function roleLabel(code: string): string {
  return ROLE_LABELS[code as RoleCode] ?? code;
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
