"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { EMPTY_PARTY_FORM } from "@/lib/party-schema";
import { saveCustomer } from "../actions";
import type { CustomerRow } from "../queries";
import { customerFormSchema, type CustomerFormValues } from "../schemas";

export function CustomerDialog({
  customer,
  trigger,
}: {
  customer?: CustomerRow;
  trigger: React.ReactNode;
}) {
  const form = useForm<CustomerFormValues, unknown, unknown>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer
      ? {
          code: customer.code ?? "",
          name: customer.name,
          taxId: customer.tax_id ?? "",
          contactName: customer.contact_name ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
          isActive: customer.is_active,
        }
      : EMPTY_PARTY_FORM,
  });
  const dialog = useDialogForm(
    form,
    (values) => saveCustomer(customer?.id ?? null, values),
    "Cliente guardado.",
  );
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={trigger}
      title={customer ? "Editar cliente" : "Nuevo cliente"}
      submitLabel={customer ? "Guardar cambios" : "Crear cliente"}
    >
      <FormField label="Nombre o razón social" htmlFor="name" required error={errors.name?.message}>
        <Input id="name" placeholder="Ej. Banco ABC" autoFocus {...form.register("name")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Código" htmlFor="code" error={errors.code?.message}>
          <Input
            id="code"
            placeholder="Opcional"
            className="uppercase placeholder:normal-case"
            {...form.register("code")}
          />
        </FormField>
        <FormField label="RNC / Cédula" htmlFor="taxId" error={errors.taxId?.message}>
          <Input id="taxId" inputMode="numeric" {...form.register("taxId")} />
        </FormField>
        <FormField label="Contacto" htmlFor="contactName" error={errors.contactName?.message}>
          <Input id="contactName" {...form.register("contactName")} />
        </FormField>
        <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" {...form.register("phone")} />
        </FormField>
      </div>
      <FormField label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" inputMode="email" {...form.register("email")} />
      </FormField>
      <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
        <Input id="address" {...form.register("address")} />
      </FormField>
      <FormField label="Notas" htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </FormField>
      {customer && (
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <label
              htmlFor="isActive"
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
            >
              <span className="text-sm font-medium">Cliente activo</span>
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      )}
    </FormDialog>
  );
}
