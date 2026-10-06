"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUPS, isActivePath } from "@/components/layout/nav-config";
import type { Permission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  permissions: readonly Permission[];
  onNavigate?: () => void;
};

export function SidebarNav({ permissions, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group, groupIndex) => {
        const items = group.items.filter(
          (item) => !item.permission || permissions.includes(item.permission),
        );
        if (items.length === 0) return null;

        return (
          <div
            key={group.label}
            style={{ "--i": groupIndex } as React.CSSProperties}
            className="animate-enter-stagger space-y-1"
          >
            <p className="px-3 text-[11px] font-medium tracking-wider text-sidebar-foreground/65 uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon, comingSoon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                        "transition-[background-color,color,transform] duration-150 ease-out-strong active:scale-[0.98]",
                        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        // Active marker: a teal bar that grows in from the centre.
                        "before:absolute before:top-1/2 before:left-0 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary",
                        "before:transition-[opacity,transform] before:duration-200 before:ease-out-strong",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] before:scale-y-100 before:opacity-100"
                          : "text-sidebar-foreground before:scale-y-30 before:opacity-0 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors duration-150",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {comingSoon && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/60 ring-1 ring-sidebar-border">
                          Pronto
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
