"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MinusIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MaterialCombobox } from "@/features/materials/components/material-combobox";
import type { MaterialOption } from "@/features/materials/queries";
import { formatMoney, formatQuantityWithUnit } from "@/lib/format";
import { applyActionErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { decimalsHint, exceedsDecimals } from "@/lib/validation";
import { createAdjustment } from "../actions";
import {
  ADJUSTMENT_REASONS,
  adjustmentFormSchema,
  type AdjustmentFormValues,
  type AdjustmentInput,
  type AdjustmentReason,
} from "../schemas";

type AdjustmentFormProps = {
  materials: MaterialOption[];
  defaultValues: AdjustmentFormValues;
  /** inventory.allow_negative (administrators). */
  canAllowNegative: boolean;
};

const DIRECTIONS = [
  { value: "in", label: "Sumar al inventario", icon: PlusIcon },
  { value: "out", label: "Restar del inventario", icon: MinusIcon },
] as const;

export function AdjustmentForm({
  materials,
  defaultValues,
  canAllowNegative,
}: AdjustmentFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AdjustmentFormValues, unknown, AdjustmentInput>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;
  const [materialId, direction, quantityText, reason] = useWatch({
    control: form.control,
    name: ["materialId", "direction", "quantity", "reason"],
  });

  const material = materials.find((item) => item.id === materialId);
  const quantity = Number(quantityText) || 0;
  const isIncrease = direction === "in";
  const newOnHand = material ? material.stockOnHand + (isIncrease ? quantity : -quantity) : 0;
  const exceedsAvailable =
    Boolean(material) && !isIncrease && quantity > (material?.stockAvailable ?? 0);
  const fmt = (value: number) =>
    material ? formatQuantityWithUnit(value, material.unitSymbol, material.unitDecimals) : "—";

  const onSubmit = form.handleSubmit(() => {
    setFormError(null);
    const values = form.getValues();
    if (material && exceedsDecimals(values.quantity, material.unitDecimals)) {
      form.setError("quantity", {
        type: "precision",
        message: `${material.unitName}: ${decimalsHint(material.unitDecimals)}.`,
      });
      return;
    }
    startTransition(async () => {
      const result = await createAdjustment(values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />

      <Card>
        <CardHeader>
          <CardTitle>Material</CardTitle>
          <CardDescription>
            Use un ajuste solo para corregir diferencias. Las compras van en Entradas y el material
            usado en trabajos se registrará en las órdenes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FormField
            label="Material"
            htmlFor="materialId"
            required
            error={errors.materialId?.message}
          >
            <Controller
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <MaterialCombobox
                  id="materialId"
                  materials={materials}
                  value={field.value}
                  invalid={Boolean(errors.materialId)}
                  onChange={(selected) => {
                    field.onChange(selected.id);
                    form.setValue("unitCost", selected.avgCost > 0 ? String(selected.avgCost) : "");
                  }}
                />
              )}
            />
          </FormField>

          {material && (
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-4 text-sm sm:grid-cols-4">
              {[
                ["Físico", fmt(material.stockOnHand)],
                ["Reservado", fmt(material.stockReserved)],
                ["Disponible", fmt(material.stockAvailable)],
                ["Costo promedio", formatMoney(material.avgCost)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajuste</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Controller
            control={form.control}
            name="direction"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label="Tipo de ajuste"
                className="grid grid-cols-2 gap-3 md:col-span-2"
              >
                {DIRECTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = field.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(value)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        selected
                          ? value === "in"
                            ? "border-success bg-success/10 text-success"
                            : "border-destructive bg-destructive/10 text-destructive"
                          : "hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          />

          <FormField
            label="Cantidad"
            htmlFor="quantity"
            required
            error={errors.quantity?.message}
            description={
              material
                ? `En ${material.unitName.toLowerCase()} · ${decimalsHint(material.unitDecimals)}`
                : undefined
            }
          >
            <QuantityInput
              id="quantity"
              suffix={material?.unitSymbol}
              placeholder="0"
              {...form.register("quantity")}
            />
          </FormField>

          {isIncrease ? (
            <FormField
              label="Costo unitario (RD$)"
              htmlFor="unitCost"
              error={errors.unitCost?.message}
              description="Por defecto, el costo promedio actual. Afecta el costo promedio del material."
            >
              <QuantityInput id="unitCost" placeholder="0.00" {...form.register("unitCost")} />
            </FormField>
          ) : (
            <div className="grid gap-2">
              <span className="text-sm font-medium">Valor del ajuste</span>
              <p className="flex h-9 items-center rounded-md bg-muted px-3 text-sm font-semibold tabular-nums">
                {material ? formatMoney(quantity * material.avgCost) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Se valora al costo promedio actual.</p>
            </div>
          )}

          <FormField label="Motivo" htmlFor="reason" required error={errors.reason?.message}>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="reason" aria-invalid={Boolean(errors.reason) || undefined}>
                    <SelectValue placeholder="Seleccione el motivo">
                      {field.value
                        ? ADJUSTMENT_REASONS[field.value as AdjustmentReason]
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADJUSTMENT_REASONS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label={reason === "other" ? "Descripción del motivo" : "Observaciones"}
            htmlFor="notes"
            required={reason === "other"}
            error={errors.notes?.message}
          >
            <Textarea
              id="notes"
              rows={2}
              placeholder="Ej. Conteo del 05/10: había 3 m² menos"
              {...form.register("notes")}
            />
          </FormField>

          {material && quantity > 0 && (
            <div className="rounded-lg border p-4 text-sm md:col-span-2">
              Stock físico después del ajuste:{" "}
              <span
                className={cn("font-semibold tabular-nums", newOnHand < 0 && "text-destructive")}
              >
                {fmt(material.stockOnHand)} → {fmt(newOnHand)}
              </span>
            </div>
          )}

          {exceedsAvailable && (
            <div className="md:col-span-2">
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>
                  La cantidad supera el disponible ({fmt(material?.stockAvailable ?? 0)})
                </AlertTitle>
                <AlertDescription>
                  {canAllowNegative
                    ? "Puede autorizarlo como excepción; quedará marcado y auditado."
                    : "El sistema no permitirá el ajuste. Si hay reservas, libérelas primero o solicite la autorización de un administrador."}
                </AlertDescription>
              </Alert>
              {canAllowNegative && (
                <Controller
                  control={form.control}
                  name="allowNegative"
                  render={({ field }) => (
                    <label
                      htmlFor="allowNegative"
                      className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">
                        Autorizar stock negativo (excepción de administrador)
                      </span>
                      <Switch
                        id="allowNegative"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </label>
                  )}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="outline" asChild>
          <Link href={material ? `/materials/${material.id}` : "/movements"}>Cancelar</Link>
        </Button>
        <SubmitButton
          pending={pending}
          pendingText="Registrando…"
          variant={isIncrease ? "default" : "destructive"}
        >
          Registrar ajuste
        </SubmitButton>
      </div>
    </form>
  );
}
