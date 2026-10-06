"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Permission } from "@/lib/auth/permissions";

export function MobileNav({ permissions }: { permissions: readonly Permission[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[18rem] max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <SheetDescription className="sr-only">Navegación principal de Workflow</SheetDescription>
        <div className="flex h-16 items-center px-5">
          <Logo inverted />
        </div>
        <div className="overflow-y-auto px-3 py-4">
          <SidebarNav permissions={permissions} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
