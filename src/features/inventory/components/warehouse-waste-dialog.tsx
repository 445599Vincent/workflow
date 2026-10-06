"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScissorsIcon } from "lucide-react";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MaterialCombobox } from "@/features/materials/components/material-combobox";
import type { MaterialOption } from "@/features/materials/queries";
import { QuantityFacts } from "@/features/work-orders/components/line-quantity-context";
import { WASTE_REASONS, type WasteReason } from "@/features/work-orders/labels";
import { wasteSchema, type WasteValues } from "@/features/work-orders/schemas";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { decimalsHint } from "@/lib/validation";
import { registerWarehouseWaste } from "../actions";

/** Waste outside any order: damaged, expired or lost in the warehouse (MER-05). */
export function WarehouseWasteDialog({ materials }: { materials: MaterialOption[] }) {
  const form = useForm<WasteValues, unknown, unknown>({
    resolver: zodResolver(wasteSchema),
    defaultValues: { materialId: "", quantity: "", reason: "damage", notes: "" },
  });
  const dialog = useDialogForm(form, registerWarehouseWaste, "Merma de almacén registrada.");
  const [materialId, reason] = useWatch({ control: form.control, name: ["materialId", "reason"] });
  const material = materials.find((item) => item.id === materialId);
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button>
          <ScissorsIcon />
          Registrar merma de almacén
        </Button>
      }
      title="Merma de almacén"
      description="Material dañado o perdido fuera de una orden. Se descuenta del disponible, al costo promedio."
      submitLabel="Registrar merma"
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
              onChange={(item) => field.onChange(item.id)}
              invalid={Boolean(errors.materialId)}
            />
          )}
        />
      </FormField>
      {material && (
        <QuantityFacts
          unitSymbol={material.unitSymbol}
          decimals={material.unitDecimals}
          facts={[
            ["Físico", material.stockOnHand],
            ["Reservado por órdenes", material.stockReserved],
            ["Disponible", material.stockAvailable],
          ]}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
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
            className="h-11 text-lg"
            {...form.register("quantity")}
          />
        </FormField>
        <FormField label="Motivo" htmlFor="reason" required error={errors.reason?.message}>
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="reason" className="h-11 w-full">
                  <SelectValue>{WASTE_REASONS[field.value as WasteReason]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WASTE_REASONS).map(([value, label]) => (
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
        label={reason === "other" ? "Descripción del motivo" : "Observaciones"}
        htmlFor="notes"
        required={reason === "other"}
        error={errors.notes?.message}
      >
        <Textarea
          id="notes"
          rows={2}
          placeholder="Ej. Se mojó en el depósito"
          {...form.register("notes")}
        />
      </FormField>
    </FormDialog>
  );
}
