import {
  ArrowLeftRightIcon,
  BarChart3Icon,
  BellIcon,
  BoxesIcon,
  BuildingIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PackagePlusIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Modules not built yet show a "Pronto" badge and a placeholder page. */
  comingSoon?: boolean;
  /** Hidden for users without this permission. */
  permission?: Permission;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon }],
  },
  {
    label: "Operación",
    items: [
      {
        href: "/work-orders",
        label: "Órdenes de trabajo",
        icon: ClipboardListIcon,
      },
      { href: "/customers", label: "Clientes", icon: BuildingIcon },
      { href: "/inventory", label: "Inventario", icon: BoxesIcon },
      { href: "/materials", label: "Materias primas", icon: PackageIcon },
      { href: "/movements", label: "Movimientos", icon: ArrowLeftRightIcon },
      { href: "/receipts", label: "Compras / Entradas", icon: PackagePlusIcon },
      { href: "/suppliers", label: "Proveedores", icon: TruckIcon },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/alerts", label: "Alertas", icon: BellIcon },
      { href: "/reports", label: "Reportes", icon: BarChart3Icon },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        href: "/users",
        label: "Usuarios",
        icon: UsersIcon,
        permission: "users.manage",
      },
      {
        href: "/audit",
        label: "Auditoría",
        icon: ShieldCheckIcon,
        permission: "audit.view",
      },
      { href: "/settings", label: "Configuración", icon: SettingsIcon },
    ],
  },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
