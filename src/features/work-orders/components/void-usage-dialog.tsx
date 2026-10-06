"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Undo2Icon } from "lucide-react";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { voidUsage } from "../actions";
import { voidUsageSchema, type VoidUsageValues } from "../schemas";

/** Voids a consumption or waste record: the stock comes back at its cost (CON-05, MER-07). */
export function VoidUsageDialog({
  kind,
  recordId,
  summary,
}: {
  kind: "consumption" | "waste";
  recordId: string;
  /** e.g. "1.5 m² de Acrílico blanco" */
  summary: string;
}) {
  const form = useForm<VoidUsageValues, unknown, unknown>({
    resolver: zodResolver(voidUsageSchema),
    defaultValues: { reason: "" },
  });
  const noun = kind === "consumption" ? "consumo" : "merma";
  const dialog = useDialogForm(
    form,
    (values) => voidUsage(kind, recordId, values),
    kind === "consumption" ? "Consumo anulado." : "Merma anulada.",
  );

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={`Anular ${noun}: ${summary}`}
        >
          <Undo2Icon />
          Anular
        </Button>
      }
      title={`Anular ${noun}`}
      description={`${summary} vuelve al inventario al mismo costo. El registro no se borra: queda marcado como anulado.`}
      submitLabel={`Anular ${noun}`}
      submitVariant="destructive"
    >
      <FormField
        label="Motivo"
        htmlFor="reason"
        required
        error={form.formState.errors.reason?.message}
      >
        <Textarea
          id="reason"
          rows={3}
          autoFocus
          placeholder="Ej. Se registró en la orden equivocada"
          {...form.register("reason")}
        />
      </FormField>
    </FormDialog>
  );
}
