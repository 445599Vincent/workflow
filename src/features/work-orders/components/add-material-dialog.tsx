"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialCombobox } from "@/features/materials/components/material-combobox";
import type { MaterialOption } from "@/features/materials/queries";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { formatMoney } from "@/lib/format";
import { addPlannedMaterial } from "../actions";
import { plannedMaterialSchema, type PlannedMaterialValues } from "../schemas";

export function AddMaterialDialog({
  workOrderId,
  materials,
}: {
  workOrderId: string;
  materials: MaterialOption[];
}) {
  const form = useForm<PlannedMaterialValues, unknown, unknown>({
    resolver: zodResolver(plannedMaterialSchema),
    defaultValues: { materialId: "", plannedQuantity: "", notes: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => addPlannedMaterial(workOrderId, values),
    "Material agregado a la orden.",
  );
  const [materialId, quantity] = useWatch({
    control: form.control,
    name: ["materialId", "plannedQuantity"],
  });
  const material = materials.find((item) => item.id === materialId);
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button variant="outline" size="sm">
          <PlusIcon />
          Agregar material
        </Button>
      }
      title="Agregar material planificado"
      description="Cantidad estimada para este trabajo. El costo estimado usa el costo promedio actual."
      submitLabel="Agregar"
    >
      <FormField label="Material" htmlFor="materialId" required error={errors.materialId?.message}>
        <Controller
          control={form.control}
          name="materialId"
          render={({ field }) => (
            <MaterialCombobox
              id="materialId"
              materials={materials}
              value={field.value}
              onChange={(selected) => field.onChange(selected.id)}
              invalid={Boolean(errors.materialId)}
            />
          )}
        />
      </FormField>
      <FormField
        label="Cantidad estimada"
        htmlFor="plannedQuantity"
        required
        error={errors.plannedQuantity?.message}
        description={
          material
            ? `Disponible: ${material.stockAvailable} ${material.unitSymbol} · Costo estimado: ${formatMoney((Number(quantity) || 0) * material.avgCost)}`
            : undefined
        }
      >
        <QuantityInput
          id="plannedQuantity"
          suffix={material?.unitSymbol}
          placeholder="0"
          {...form.register("plannedQuantity")}
        />
      </FormField>
      <FormField label="Nota" htmlFor="notes" error={errors.notes?.message}>
        <Input id="notes" placeholder="Opcional (ej. cara frontal)" {...form.register("notes")} />
      </FormField>
    </FormDialog>
  );
}
