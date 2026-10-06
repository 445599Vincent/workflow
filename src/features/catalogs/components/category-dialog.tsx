"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { saveCategory } from "../actions";
import type { CategoryRow } from "../queries";
import { categoryFormSchema, type CategoryFormValues } from "../schemas";
import { ActiveSwitchField } from "./active-switch-field";

export function CategoryDialog({
  category,
  trigger,
}: {
  category?: CategoryRow;
  trigger: React.ReactNode;
}) {
  const form = useForm<CategoryFormValues, unknown, unknown>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      sortOrder: String(category?.sort_order ?? 0),
      isActive: category?.is_active ?? true,
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => saveCategory(category?.id ?? null, values),
    "Categoría guardada.",
  );
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={category ? "Editar categoría" : "Nueva categoría"}
      submitLabel={category ? "Guardar cambios" : "Crear categoría"}
    >
      <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" placeholder="Ej. Viniles" autoFocus {...form.register("name")} />
      </FormField>
      <FormField label="Descripción" htmlFor="description" error={errors.description?.message}>
        <Input id="description" {...form.register("description")} />
      </FormField>
      <FormField
        label="Orden"
        htmlFor="sortOrder"
        error={errors.sortOrder?.message}
        description="Posición en las listas (menor aparece primero)."
      >
        <Input
          id="sortOrder"
          inputMode="numeric"
          className="w-28"
          {...form.register("sortOrder")}
        />
      </FormField>
      <ActiveSwitchField
        control={form.control}
        name="isActive"
        description="Una categoría inactiva no se ofrece para materiales nuevos."
      />
    </FormDialog>
  );
}
