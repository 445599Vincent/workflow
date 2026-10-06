import { BoxesIcon, ClipboardCheckIcon, TrendingDownIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";

const HIGHLIGHTS = [
  { icon: BoxesIcon, text: "Qué material tenemos y qué está comprometido" },
  { icon: ClipboardCheckIcon, text: "Qué se usó en cada orden de trabajo" },
  { icon: TrendingDownIcon, text: "Cuánto se desperdició y cuánto costó realmente" },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.18),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-24 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(29,95,216,0.35),transparent_65%)]"
        />
        <Logo inverted className="relative" />
        <div className="relative max-w-md space-y-8">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">
            Control de materia prima y órdenes de trabajo.
          </h2>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/5 text-sidebar-primary ring-1 ring-white/10">
                  <Icon className="size-4" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">
          Workflow · Letreros, vallas, impresión e instalaciones
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Logo className="mb-10 lg:hidden" />
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
