"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { Input } from "@/components/ui/input";
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
import { useDialogForm } from "@/hooks/use-dialog-form";
import { decimalsHint } from "@/lib/validation";
import {
  consumeMaterial,
  registerWaste,
  releaseReservation,
  reserveMaterial,
  updatePlannedQuantity,
} from "../actions";
import { WASTE_REASONS, type WasteReason } from "../labels";
import type { WorkOrderLine } from "../queries";
import {
  movementQuantitySchema,
  plannedQuantitySchema,
  releaseSchema,
  wasteSchema,
  type MovementQuantityValues,
  type PlannedQuantityValues,
  type ReleaseValues,
  type WasteValues,
} from "../schemas";
import { QuantityFacts } from "./line-quantity-context";

type DialogBase = { trigger: React.ReactNode };

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.max(0, Math.round(value * factor) / factor);
}

function unitHint(line: { unitName: string; unitDecimals: number }) {
  return `En ${line.unitName.toLowerCase()} · ${decimalsHint(line.unitDecimals)}`;
}

// -----------------------------------------------------------------------------
// Reserve (RES-01..03)
// -----------------------------------------------------------------------------
export function ReserveDialog({ line, trigger }: DialogBase & { line: WorkOrderLine }) {
  const pendingToReserve = roundTo(
    Math.min(
      line.planned_quantity - line.reserved_quantity - line.usedQuantity,
      line.material.stock_available ?? 0,
    ),
    line.unitDecimals,
  );
  const form = useForm<MovementQuantityValues, unknown, unknown>({
    resolver: zodResolver(movementQuantitySchema),
    defaultValues: {
      materialId: line.material_id,
      quantity: pendingToReserve > 0 ? String(pendingToReserve) : "",
      notes: "",
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => reserveMaterial(line.id, values),
    "Material reservado.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={`Reservar ${line.material.name}`}
      description="Aparta material del disponible para esta orden. El stock físico no cambia."
      submitLabel="Reservar"
    >
      <QuantityFacts
        unitSymbol={line.unitSymbol}
        decimals={line.unitDecimals}
        facts={[
          ["Disponible en almacén", line.material.stock_available ?? 0],
          ["Planificado", line.planned_quantity],
          ["Ya reservado", line.reserved_quantity],
        ]}
      />
      <FormField
        label="Cantidad a reservar"
        htmlFor="quantity"
        required
        error={form.formState.errors.quantity?.message}
        description={unitHint(line)}
      >
        <QuantityInput
          id="quantity"
          suffix={line.unitSymbol}
          autoFocus
          {...form.register("quantity")}
        />
      </FormField>
      <FormField label="Nota" htmlFor="notes" error={form.formState.errors.notes?.message}>
        <Input id="notes" placeholder="Opcional" {...form.register("notes")} />
      </FormField>
    </FormDialog>
  );
}

// -----------------------------------------------------------------------------
// Release (RES-04)
// -----------------------------------------------------------------------------
export function ReleaseDialog({ line, trigger }: DialogBase & { line: WorkOrderLine }) {
  const form = useForm<ReleaseValues, unknown, unknown>({
    resolver: zodResolver(releaseSchema),
    defaultValues: { quantity: "", notes: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => releaseReservation(line.id, values),
    "Reserva liberada.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={`Liberar reserva de ${line.material.name}`}
      description="Devuelve el material reservado al disponible del almacén."
      submitLabel="Liberar"
    >
      <QuantityFacts
        unitSymbol={line.unitSymbol}
        decimals={line.unitDecimals}
        facts={[["Reservado en esta orden", line.reserved_quantity]]}
      />
      <FormField
        label="Cantidad a liberar"
        htmlFor="quantity"
        error={form.formState.errors.quantity?.message}
        description="Déjelo vacío para liberar todo lo reservado."
      >
        <QuantityInput
          id="quantity"
          suffix={line.unitSymbol}
          placeholder="Todo"
          autoFocus
          {...form.register("quantity")}
        />
      </FormField>
      <FormField label="Nota" htmlFor="notes" error={form.formState.errors.notes?.message}>
        <Input id="notes" placeholder="Opcional" {...form.register("notes")} />
      </FormField>
    </FormDialog>
  );
}

// -----------------------------------------------------------------------------
// Consumption (CON) and waste (MER)
// -----------------------------------------------------------------------------
type UsageDialogProps = DialogBase & {
  workOrderId: string;
  /** Known line (from the materials table) or free choice of material. */
  line?: WorkOrderLine;
  materials: MaterialOption[];
  lines: WorkOrderLine[];
};

function UsageFacts({ line, material }: { line?: WorkOrderLine; material?: MaterialOption }) {
  if (line) {
    return (
      <QuantityFacts
        unitSymbol={line.unitSymbol}
        decimals={line.unitDecimals}
        facts={[
          ["Planificado", line.planned_quantity],
          ["Usado hasta ahora", line.usedQuantity],
          ["Reservado (se usa primero)", line.reserved_quantity],
        ]}
      />
    );
  }
  if (material) {
    return (
      <QuantityFacts
        unitSymbol={material.unitSymbol}
        decimals={material.unitDecimals}
        facts={[["Disponible en almacén", material.stockAvailable]]}
      />
    );
  }
  return null;
}

function useUsageContext(props: UsageDialogProps, materialId: string) {
  const line = props.line ?? props.lines.find((item) => item.material_id === materialId);
  const material = props.materials.find((item) => item.id === materialId);
  const unitSymbol = line?.unitSymbol ?? material?.unitSymbol;
  const hint = line ? unitHint(line) : material ? unitHint(material) : undefined;
  return { line, material, unitSymbol, hint };
}

export function ConsumeDialog(props: UsageDialogProps) {
  const form = useForm<MovementQuantityValues, unknown, unknown>({
    resolver: zodResolver(movementQuantitySchema),
    defaultValues: { materialId: props.line?.material_id ?? "", quantity: "", notes: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => consumeMaterial(props.workOrderId, values),
    "Consumo registrado.",
  );
  const materialId = useWatch({ control: form.control, name: "materialId" });
  const { line, material, unitSymbol, hint } = useUsageContext(props, materialId);
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={props.trigger}
      title={props.line ? `Consumo de ${props.line.material.name}` : "Registrar consumo"}
      description="Material útil realmente usado en el trabajo. Sale del inventario al costo promedio."
      submitLabel="Registrar consumo"
    >
      {!props.line && (
        <FormField
          label="Material"
          htmlFor="materialId"
          required
          error={errors.materialId?.message}
          description={
            materialId && !line
              ? "No está planificado: se agregará como no planificado."
              : undefined
          }
        >
          <Controller
            control={form.control}
            name="materialId"
            render={({ field }) => (
              <MaterialCombobox
                id="materialId"
                materials={props.materials}
                value={field.value}
                onChange={(item) => field.onChange(item.id)}
              />
            )}
          />
        </FormField>
      )}
      <UsageFacts line={line} material={material} />
      <FormField
        label="Cantidad usada"
        htmlFor="quantity"
        required
        error={errors.quantity?.message}
        description={hint}
      >
        <QuantityInput
          id="quantity"
          suffix={unitSymbol}
          autoFocus={Boolean(props.line)}
          className="h-11 text-lg"
          {...form.register("quantity")}
        />
      </FormField>
      <FormField label="Nota" htmlFor="notes" error={errors.notes?.message}>
        <Input
          id="notes"
          placeholder="Opcional (ej. impresión de caras)"
          {...form.register("notes")}
        />
      </FormField>
    </FormDialog>
  );
}

export function WasteDialog(props: UsageDialogProps) {
  const form = useForm<WasteValues, unknown, unknown>({
    resolver: zodResolver(wasteSchema),
    defaultValues: {
      materialId: props.line?.material_id ?? "",
      quantity: "",
      reason: "cutting",
      notes: "",
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => registerWaste(props.workOrderId, values),
    "Merma registrada.",
  );
  const [materialId, reason] = useWatch({ control: form.control, name: ["materialId", "reason"] });
  const { line, material, unitSymbol, hint } = useUsageContext(props, materialId);
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={props.trigger}
      title={props.line ? `Merma de ${props.line.material.name}` : "Registrar merma"}
      description="Desperdicio: sale del inventario y suma al costo real de la orden."
      submitLabel="Registrar merma"
    >
      {!props.line && (
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
                materials={props.materials}
                value={field.value}
                onChange={(item) => field.onChange(item.id)}
              />
            )}
          />
        </FormField>
      )}
      <UsageFacts line={line} material={material} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Cantidad desperdiciada"
          htmlFor="quantity"
          required
          error={errors.quantity?.message}
          description={hint}
        >
          <QuantityInput
            id="quantity"
            suffix={unitSymbol}
            autoFocus={Boolean(props.line)}
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
                <SelectTrigger id="reason" className="h-11">
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
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </FormField>
    </FormDialog>
  );
}

// -----------------------------------------------------------------------------
// Planned quantity (PLN-03)
// -----------------------------------------------------------------------------
export function PlannedQuantityDialog({ line, trigger }: DialogBase & { line: WorkOrderLine }) {
  const form = useForm<PlannedQuantityValues, unknown, unknown>({
    resolver: zodResolver(plannedQuantitySchema),
    defaultValues: {
      plannedQuantity: line.planned_quantity > 0 ? String(line.planned_quantity) : "",
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => updatePlannedQuantity(line.id, values),
    "Cantidad estimada actualizada.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={`Cantidad estimada de ${line.material.name}`}
      description={
        line.is_planned ? undefined : "Al darle una cantidad, el material pasa a estar planificado."
      }
      submitLabel="Guardar"
    >
      <FormField
        label="Cantidad estimada"
        htmlFor="plannedQuantity"
        required
        error={form.formState.errors.plannedQuantity?.message}
        description={unitHint(line)}
      >
        <QuantityInput
          id="plannedQuantity"
          suffix={line.unitSymbol}
          autoFocus
          {...form.register("plannedQuantity")}
        />
      </FormField>
    </FormDialog>
  );
}
