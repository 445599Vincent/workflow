"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatQuantityWithUnit, todayISODate } from "@/lib/format";
import { applyActionErrors } from "@/lib/forms";
import { decimalsHint, exceedsDecimals } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { MaterialCombobox } from "@/features/materials/components/material-combobox";
import { postReceipt } from "../actions";
import type { ReceiptFormOptions } from "../queries";
import {
  EMPTY_RECEIPT_LINE,
  MAX_RECEIPT_LINES,
  receiptFormSchema,
  type ReceiptFormValues,
  type ReceiptInput,
} from "../schemas";

const NONE = "none";
const LINE_GRID = "md:grid-cols-[minmax(0,1fr)_9rem_9rem_8rem_2.25rem]";

function toNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ReceiptFormProps = {
  options: ReceiptFormOptions;
  defaultValues: ReceiptFormValues;
};

export function ReceiptForm({ options, defaultValues }: ReceiptFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ReceiptFormValues, unknown, ReceiptInput>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" });
  const { errors } = form.formState;

  const materialsById = new Map(options.materials.map((material) => [material.id, material]));
  const lineTotals = lines.map((line) => toNumber(line.quantity) * toNumber(line.unitCost));
  const grandTotal = lineTotals.reduce((sum, value) => sum + value, 0);

  const onSubmit = form.handleSubmit(() => {
    setFormError(null);
    // Raw values: the Server Action re-validates with the same schema.
    const values = form.getValues();

    // Unit precision (e.g. screws in whole units). The database enforces it
    // too; checking here points at the exact line before submitting.
    let precisionOk = true;
    values.lines.forEach((line, index) => {
      const material = materialsById.get(line.materialId);
      if (material && exceedsDecimals(line.quantity, material.unitDecimals)) {
        precisionOk = false;
        form.setError(`lines.${index}.quantity`, {
          type: "precision",
          message: `${material.unitName}: ${decimalsHint(material.unitDecimals)}.`,
        });
      }
    });
    if (!precisionOk) return;

    startTransition(async () => {
      const result = await postReceipt(values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />

      <Card>
        <CardHeader>
          <CardTitle>Datos de la entrada</CardTitle>
          <CardDescription>Fecha de recepción y documento del proveedor.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <FormField
            label="Fecha"
            htmlFor="receiptDate"
            required
            error={errors.receiptDate?.message}
          >
            <Input
              id="receiptDate"
              type="date"
              max={todayISODate()}
              {...form.register("receiptDate")}
            />
          </FormField>

          <FormField label="Proveedor" htmlFor="supplierId" error={errors.supplierId?.message}>
            <Controller
              control={form.control}
              name="supplierId"
              render={({ field }) => {
                const supplier = options.suppliers.find((item) => item.id === field.value);
                return (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                  >
                    <SelectTrigger id="supplierId">
                      <SelectValue>{supplier?.name ?? "Sin proveedor"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin proveedor</SelectItem>
                      {options.suppliers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
          </FormField>

          <FormField
            label="No. de factura"
            htmlFor="invoiceNumber"
            error={errors.invoiceNumber?.message}
          >
            <Input
              id="invoiceNumber"
              autoComplete="off"
              placeholder="Ej. B0100004512"
              {...form.register("invoiceNumber")}
            />
          </FormField>

          <FormField
            label="Observaciones"
            htmlFor="notes"
            error={errors.notes?.message}
            className="md:col-span-3"
          >
            <Textarea id="notes" rows={2} placeholder="Opcional" {...form.register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader className="pb-5">
          <CardTitle>Materiales recibidos</CardTitle>
          <CardDescription>
            Cantidades en la unidad de inventario de cada material. El costo sugerido es el último
            costo de compra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={cn(
              "hidden gap-3 px-1 text-xs font-medium text-muted-foreground uppercase md:grid",
              LINE_GRID,
            )}
          >
            <span>Material</span>
            <span>Cantidad</span>
            <span>Costo unitario</span>
            <span className="text-right">Total</span>
            <span className="sr-only">Quitar</span>
          </div>

          {fields.map((field, index) => {
            const line = lines[index];
            const material = line?.materialId ? materialsById.get(line.materialId) : undefined;
            const lineErrors = errors.lines?.[index];
            const duplicateOf = line?.materialId
              ? lines.findIndex(
                  (other, otherIndex) => otherIndex < index && other.materialId === line.materialId,
                )
              : -1;

            return (
              <div
                key={field.id}
                className={cn(
                  "grid gap-3 rounded-lg border p-3 md:items-start md:border-0 md:p-1",
                  LINE_GRID,
                )}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor={`lines.${index}.materialId`} className="md:sr-only">
                    Material
                  </Label>
                  <Controller
                    control={form.control}
                    name={`lines.${index}.materialId`}
                    render={({ field: materialField }) => (
                      <MaterialCombobox
                        id={`lines.${index}.materialId`}
                        materials={options.materials}
                        value={materialField.value}
                        invalid={Boolean(lineErrors?.materialId)}
                        onChange={(selected) => {
                          materialField.onChange(selected.id);
                          if (!form.getValues(`lines.${index}.unitCost`) && selected.lastCost > 0) {
                            form.setValue(`lines.${index}.unitCost`, String(selected.lastCost));
                          }
                        }}
                      />
                    )}
                  />
                  {lineErrors?.materialId && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {lineErrors.materialId.message}
                    </p>
                  )}
                  {duplicateOf >= 0 && (
                    <p className="text-xs text-warning">
                      Este material ya está en la línea {duplicateOf + 1}.
                    </p>
                  )}
                  {material && (
                    <p className="text-xs text-muted-foreground">
                      Existencia actual:{" "}
                      {formatQuantityWithUnit(
                        material.stockOnHand,
                        material.unitSymbol,
                        material.unitDecimals,
                      )}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`lines.${index}.quantity`} className="md:sr-only">
                      Cantidad
                    </Label>
                    <QuantityInput
                      id={`lines.${index}.quantity`}
                      suffix={material?.unitSymbol}
                      placeholder="0"
                      aria-invalid={Boolean(lineErrors?.quantity) || undefined}
                      {...form.register(`lines.${index}.quantity`)}
                    />
                    {lineErrors?.quantity && (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {lineErrors.quantity.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`lines.${index}.unitCost`} className="md:sr-only">
                      Costo unitario (RD$)
                    </Label>
                    <QuantityInput
                      id={`lines.${index}.unitCost`}
                      placeholder="0.00"
                      aria-invalid={Boolean(lineErrors?.unitCost) || undefined}
                      {...form.register(`lines.${index}.unitCost`)}
                    />
                    {lineErrors?.unitCost && (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {lineErrors.unitCost.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 md:contents">
                  <p className="text-sm font-semibold tabular-nums md:flex md:h-9 md:items-center md:justify-end">
                    <span className="mr-2 font-normal text-muted-foreground md:hidden">
                      Total línea
                    </span>
                    {formatMoney(lineTotals[index] ?? 0)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Quitar línea ${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            );
          })}

          {(errors.lines?.message ?? errors.lines?.root?.message) && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errors.lines?.message ?? errors.lines?.root?.message}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ ...EMPTY_RECEIPT_LINE })}
            disabled={fields.length >= MAX_RECEIPT_LINES}
          >
            <PlusIcon />
            Agregar material
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0">
        <p className="text-sm text-muted-foreground">
          {fields.length} {fields.length === 1 ? "línea" : "líneas"} · Total{" "}
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {formatMoney(grandTotal)}
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/receipts">Cancelar</Link>
          </Button>
          <SubmitButton pending={pending} pendingText="Registrando…">
            Registrar entrada
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
