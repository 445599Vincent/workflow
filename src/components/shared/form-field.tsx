import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  description?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + help text + validation message, with accessible wiring. */
export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("grid gap-2", className)} data-invalid={Boolean(error) || undefined}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      <FieldControl describedBy={[descriptionId, errorId]} invalid={Boolean(error)}>
        {children}
      </FieldControl>
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Adds aria-describedby / aria-invalid to a single child control. */
function FieldControl({
  describedBy,
  invalid,
  children,
}: {
  describedBy: (string | undefined)[];
  invalid: boolean;
  children: React.ReactNode;
}) {
  if (!React.isValidElement<Record<string, unknown>>(children)) return <>{children}</>;
  const ids = describedBy.filter(Boolean).join(" ") || undefined;
  return React.cloneElement(children, {
    "aria-describedby": ids,
    "aria-invalid": invalid || undefined,
  });
}
