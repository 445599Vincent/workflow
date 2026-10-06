"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { saveLocation } from "../actions";
import type { LocationRow } from "../queries";
import { locationFormSchema, type LocationFormValues } from "../schemas";
import { ActiveSwitchField } from "./active-switch-field";

export function LocationDialog({
  location,
  trigger,
}: {
  location?: LocationRow;
  trigger: React.ReactNode;
}) {
  const form = useForm<LocationFormValues, unknown, unknown>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      code: location?.code ?? "",
      name: location?.name ?? "",
      description: location?.description ?? "",
      isActive: location?.is_active ?? true,
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => saveLocation(location?.id ?? null, values),
    "Ubicación guardada.",
  );
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={location ? "Editar ubicación" : "Nueva ubicación"}
      submitLabel={location ? "Guardar cambios" : "Crear ubicación"}
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField label="Código" htmlFor="code" required error={errors.code?.message}>
          <Input
            id="code"
            placeholder="EST-A"
            className="uppercase placeholder:normal-case"
            autoFocus
            {...form.register("code")}
          />
        </FormField>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" placeholder="Estante A" {...form.register("name")} />
        </FormField>
      </div>
      <FormField label="Descripción" htmlFor="description" error={errors.description?.message}>
        <Input
          id="description"
          placeholder="Qué se guarda aquí"
          {...form.register("description")}
        />
      </FormField>
      <ActiveSwitchField
        control={form.control}
        name="isActive"
        description="Una ubicación inactiva no se ofrece al asignar materiales."
      />
    </FormDialog>
  );
}
