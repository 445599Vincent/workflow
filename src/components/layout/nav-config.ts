import {
  ArrowLeftRightIcon,
  BarChart3Icon,
  BoxesIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PackagePlusIcon,
  SettingsIcon,
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
        comingSoon: true,
      },
      { href: "/inventory", label: "Inventario", icon: BoxesIcon, comingSoon: true },
      { href: "/materials", label: "Materias primas", icon: PackageIcon },
      { href: "/movements", label: "Movimientos", icon: ArrowLeftRightIcon },
      { href: "/receipts", label: "Compras / Entradas", icon: PackagePlusIcon },
      { href: "/suppliers", label: "Proveedores", icon: TruckIcon },
    ],
  },
  {
    label: "Análisis",
    items: [{ href: "/reports", label: "Reportes", icon: BarChart3Icon, comingSoon: true }],
  },
  {
    label: "Administración",
    items: [
      {
        href: "/users",
        label: "Usuarios",
        icon: UsersIcon,
        comingSoon: true,
        permission: "users.manage",
      },
      { href: "/settings", label: "Configuración", icon: SettingsIcon },
    ],
  },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
