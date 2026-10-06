import Link from "next/link";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/shared/logo";
import type { Permission } from "@/lib/auth/permissions";

/** Fixed desktop sidebar (lg and up). Mobile uses MobileNav in the header. */
export function AppSidebar({ permissions }: { permissions: readonly Permission[] }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link
          href="/dashboard"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo inverted />
        </Link>
      </div>
      <div className="scrollbar-sidebar flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav permissions={permissions} />
      </div>
      <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/50">
        Materia prima · Órdenes de trabajo
      </div>
    </aside>
  );
}
