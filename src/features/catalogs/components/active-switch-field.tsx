"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { Switch } from "@/components/ui/switch";

/** "Activo" toggle used by every catalog form. */
export function ActiveSwitchField<T extends FieldValues, TOutput>({
  control,
  name,
  description,
}: {
  control: Control<T, unknown, TOutput>;
  name: Path<T>;
  description: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label
          htmlFor={String(name)}
          className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3"
        >
          <span className="space-y-1">
            <span className="block text-sm font-medium">Activo</span>
            <span className="block text-xs text-muted-foreground">{description}</span>
          </span>
          <Switch id={String(name)} checked={field.value} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );
}
