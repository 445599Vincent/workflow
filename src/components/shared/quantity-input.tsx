import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Decimal text input (numeric keypad on phones) with an optional unit suffix. */
export function QuantityInput({
  suffix,
  className,
  ...props
}: React.ComponentProps<"input"> & { suffix?: string | null }) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        autoComplete="off"
        className={cn("tabular-nums", suffix && "pr-14", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}
