"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { Button } from "@/components/ui/button";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { updateThresholds } from "../actions";
import { thresholdsSchema, type ThresholdsFormValues } from "../schemas";

/** Alert thresholds used by order variance (CON-04) and high waste (MER-06). */
export function ThresholdsDialog({
  varianceAlertPct,
  wasteAlertPct,
}: {
  varianceAlertPct: number;
  wasteAlertPct: number;
}) {
  const form = useForm<ThresholdsFormValues, unknown, unknown>({
    resolver: zodResolver(thresholdsSchema),
    defaultValues: {
      varianceAlertPct: String(varianceAlertPct),
      wasteAlertPct: String(wasteAlertPct),
    },
  });
  const dialog = useDialogForm(form, updateThresholds, "Umbrales actualizados.");
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button variant="outline" size="sm">
          <PencilIcon />
          Editar umbrales
        </Button>
      }
      title="Umbrales de alertas"
      description="Se aplican de inmediato en alertas, órdenes y dashboard. Cada cambio queda en la auditoría."
      submitLabel="Guardar"
    >
      <FormField
        label="Alerta de variación de consumo"
        htmlFor="varianceAlertPct"
        required
        error={errors.varianceAlertPct?.message}
        description="Una orden alerta si su costo real supera el estimado en más de este porcentaje."
      >
        <QuantityInput id="varianceAlertPct" suffix="%" {...form.register("varianceAlertPct")} />
      </FormField>
      <FormField
        label="Alerta de merma considerable"
        htmlFor="wasteAlertPct"
        required
        error={errors.wasteAlertPct?.message}
        description="Un material de una orden alerta si su merma supera este porcentaje de lo usado."
      >
        <QuantityInput id="wasteAlertPct" suffix="%" {...form.register("wasteAlertPct")} />
      </FormField>
    </FormDialog>
  );
}
