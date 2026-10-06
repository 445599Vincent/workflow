"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { saveUnit } from "../actions";
import type { UnitRow } from "../queries";
import { UNIT_KINDS, unitFormSchema, type UnitFormValues, type UnitKind } from "../schemas";
import { ActiveSwitchField } from "./active-switch-field";

const DECIMAL_OPTIONS = [
  { value: "0", label: "0 — solo enteros (tornillos, piezas)" },
  { value: "1", label: "1 decimal" },
  { value: "2", label: "2 decimales (m², metros)" },
  { value: "3", label: "3 decimales (kg, litros)" },
  { value: "4", label: "4 decimales" },
];

export function UnitDialog({ unit, trigger }: { unit?: UnitRow; trigger: React.ReactNode }) {
  const editing = Boolean(unit);
  const form = useForm<UnitFormValues, unknown, unknown>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      code: unit?.code ?? "",
      name: unit?.name ?? "",
      symbol: unit?.symbol ?? "",
      kind: unit?.kind ?? ("" as UnitKind),
      decimals: String(unit?.decimals ?? 2),
      isActive: unit?.is_active ?? true,
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => saveUnit(unit?.id ?? null, values),
    "Unidad guardada.",
  );
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={editing ? "Editar unidad" : "Nueva unidad de medida"}
      description={
        editing
          ? "El código y el tipo no cambian porque otros registros dependen de ellos. Cambiar los decimales aplica a movimientos nuevos."
          : undefined
      }
      submitLabel={editing ? "Guardar cambios" : "Crear unidad"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" placeholder="Ej. Metro cuadrado" autoFocus {...form.register("name")} />
        </FormField>
        <FormField label="Símbolo" htmlFor="symbol" required error={errors.symbol?.message}>
          <Input id="symbol" placeholder="m²" {...form.register("symbol")} />
        </FormField>
        <FormField
          label="Código"
          htmlFor="code"
          required
          error={errors.code?.message}
          description={editing ? undefined : "Interno, en minúsculas (ej. m2)."}
        >
          <Input
            id="code"
            placeholder="m2"
            disabled={editing}
            className="lowercase"
            {...form.register("code")}
          />
        </FormField>
        <FormField label="Tipo" htmlFor="kind" required error={errors.kind?.message}>
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={editing}
              >
                <SelectTrigger id="kind" aria-invalid={Boolean(errors.kind) || undefined}>
                  <SelectValue placeholder="Seleccione">
                    {field.value ? UNIT_KINDS[field.value as UnitKind] : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_KINDS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <FormField
        label="Decimales permitidos"
        htmlFor="decimals"
        error={errors.decimals?.message}
        description="Precisión con la que se registran cantidades en esta unidad."
      >
        <Controller
          control={form.control}
          name="decimals"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="decimals">
                <SelectValue>
                  {DECIMAL_OPTIONS.find((option) => option.value === field.value)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DECIMAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <ActiveSwitchField
        control={form.control}
        name="isActive"
        description="Una unidad inactiva no se ofrece para materiales nuevos."
      />
    </FormDialog>
  );
}
