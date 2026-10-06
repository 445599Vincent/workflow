import { cn } from "@/lib/utils";

/** Workflow mark: a teal "W" path on a deep-blue tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="#0b2545" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        fill="none"
        stroke="#2dd4bf"
        strokeOpacity="0.35"
      />
      <path
        d="M7 10l4 12 5-9 5 9 4-12"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          inverted ? "text-white" : "text-foreground",
        )}
      >
        Workflow
      </span>
    </span>
  );
}
