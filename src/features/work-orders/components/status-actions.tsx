"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeftIcon, BanIcon, CircleCheckBigIcon, RotateCcwIcon } from "lucide-react";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { formatDuration } from "@/lib/format";
import { cancelWorkOrder, changeWorkOrderStatus } from "../actions";
import type { CostSummary } from "../costs";
import { STATUS_FLOW, WORK_ORDER_STATUS, type WorkOrderStatus } from "../labels";
import {
  cancelSchema,
  statusChangeSchema,
  type CancelValues,
  type StatusChangeValues,
} from "../schemas";
import { CostFacts } from "./cost-summary";

type OrderRef = { id: string; number: string; status: WorkOrderStatus };

function NoteField({
  form,
  label = "Nota",
  placeholder = "Opcional",
}: {
  form: ReturnType<typeof useForm<StatusChangeValues, unknown, unknown>>;
  label?: string;
  placeholder?: string;
}) {
  return (
    <FormField label={label} htmlFor="note" error={form.formState.errors.note?.message}>
      <Textarea id="note" rows={2} placeholder={placeholder} {...form.register("note")} />
    </FormField>
  );
}

/** Plain lifecycle change: forward any number of steps or one step back (OT-03). */
export function ChangeStatusDialog({
  order,
  targets,
}: {
  order: OrderRef;
  targets: WorkOrderStatus[];
}) {
  // Suggest the next step forward; fall back to the only way back.
  const rank = STATUS_FLOW.indexOf(order.status);
  const suggested = targets.find((status) => STATUS_FLOW.indexOf(status) > rank) ?? targets[0];
  const form = useForm<StatusChangeValues, unknown, unknown>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { status: suggested ?? "pending", note: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => changeWorkOrderStatus(order.id, values),
    "Estado actualizado.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button variant="outline">
          <ArrowRightLeftIcon />
          Cambiar estado
        </Button>
      }
      title={`Cambiar estado de ${order.number}`}
      description={`Estado actual: ${WORK_ORDER_STATUS[order.status].label}. Puede avanzar o retroceder un paso.`}
      submitLabel="Cambiar estado"
    >
      <FormField
        label="Nuevo estado"
        htmlFor="status"
        required
        error={form.formState.errors.status?.message}
      >
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Seleccione…">
                  {WORK_ORDER_STATUS[field.value as WorkOrderStatus]?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {targets.map((status) => (
                  <SelectItem key={status} value={status}>
                    {WORK_ORDER_STATUS[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <NoteField form={form} />
    </FormDialog>
  );
}

/** Completing freezes the actual cost and releases leftover reservations (CIE-01..03). */
export function CompleteDialog({
  order,
  summary,
  usedLines,
  responsible,
  startedAt,
  reservedLines,
}: {
  order: OrderRef;
  summary: CostSummary;
  usedLines: number;
  responsible: string | null;
  startedAt: string | null;
  reservedLines: number;
}) {
  const form = useForm<StatusChangeValues, unknown, unknown>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { status: "completed", note: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => changeWorkOrderStatus(order.id, values),
    "Orden terminada.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button>
          <CircleCheckBigIcon />
          Terminar orden
        </Button>
      }
      title={`Terminar ${order.number}`}
      description="La orden queda cerrada: no admite más consumos ni mermas y su costo real queda fijo."
      submitLabel="Terminar orden"
    >
      <CostFacts summary={summary} className="rounded-lg bg-muted/60 p-3" />
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Materiales usados</dt>
          <dd className="font-medium">{usedLines}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Responsable</dt>
          <dd className="font-medium">{responsible ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duración</dt>
          <dd className="font-medium">{formatDuration(startedAt)}</dd>
        </div>
      </dl>
      {reservedLines > 0 && (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          {reservedLines === 1
            ? "Un material tiene reservas sin usar; "
            : `${reservedLines} materiales tienen reservas sin usar; `}
          se liberarán y volverán a estar disponibles.
        </p>
      )}
      <NoteField form={form} label="Nota de cierre" />
    </FormDialog>
  );
}

export function CancelOrderDialog({ order }: { order: OrderRef }) {
  const form = useForm<CancelValues, unknown, unknown>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { note: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => cancelWorkOrder(order.id, values),
    "Orden cancelada.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <BanIcon />
          Cancelar orden
        </Button>
      }
      title={`Cancelar ${order.number}`}
      description="Las reservas se liberan. Lo ya consumido no vuelve al inventario: si sobró material, regístrelo con un ajuste de entrada."
      submitLabel="Cancelar orden"
      submitVariant="destructive"
    >
      <FormField label="Motivo" htmlFor="note" required error={form.formState.errors.note?.message}>
        <Textarea
          id="note"
          rows={3}
          autoFocus
          placeholder="Ej. El cliente desistió del trabajo"
          {...form.register("note")}
        />
      </FormField>
    </FormDialog>
  );
}

/** Administrators only: a closed order goes back to production (OT-03). */
export function ReopenDialog({ order }: { order: OrderRef }) {
  const form = useForm<StatusChangeValues, unknown, unknown>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { status: "in_production", note: "" },
  });
  const dialog = useDialogForm(
    form,
    (values) => changeWorkOrderStatus(order.id, values),
    "Orden reabierta.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button variant="outline">
          <RotateCcwIcon />
          Reabrir
        </Button>
      }
      title={`Reabrir ${order.number}`}
      description="La orden vuelve a En producción para registrar consumos o correcciones. Queda en el historial."
      submitLabel="Reabrir"
    >
      <NoteField form={form} label="Motivo" placeholder="Ej. Faltó registrar material" />
    </FormDialog>
  );
}
