import Link from "next/link";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/shared/logo";
import type { Permission } from "@/lib/auth/permissions";

/** Fixed desktop sidebar (lg and up). Mobile uses MobileNav in the header. */
export function AppSidebar({ permissions }: { permissions: readonly Permission[] }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Ambient glow, same language as the sign-in screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-80 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.12),transparent_65%)]"
      />
      <div className="relative flex h-16 items-center px-5">
        <Link
          href="/dashboard"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo inverted />
        </Link>
      </div>
      <div className="relative flex-1 [scrollbar-width:thin] [scrollbar-color:var(--sidebar-border)_transparent] overflow-y-auto overscroll-contain px-3 py-4">
        <SidebarNav permissions={permissions} />
      </div>
      <div className="relative border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/60">
        Materia prima · Órdenes de trabajo
      </div>
    </aside>
  );
}
