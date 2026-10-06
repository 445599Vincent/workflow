import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "warning" | "danger" | "success";

const TONES: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/12 text-success",
};

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  /** Position in a grid; drives the staggered entrance delay. */
  index?: number;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  href,
  index = 0,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full gap-3 py-4",
        href &&
          "transition-[border-color,box-shadow,transform] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:scale-[0.99]",
      )}
    >
      <div className="flex items-start justify-between gap-2 px-3 sm:gap-3 sm:px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "hidden size-8 shrink-0 items-center justify-center rounded-md sm:flex",
            TONES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="px-3 sm:px-4">
        <p className="text-lg font-semibold tracking-tight break-words tabular-nums sm:text-2xl">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );

  const style = { "--i": index } as React.CSSProperties;

  return href ? (
    <Link
      href={href}
      style={style}
      className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      {content}
    </Link>
  ) : (
    <div style={style}>{content}</div>
  );
}
