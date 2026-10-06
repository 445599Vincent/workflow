"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyActionErrors } from "@/lib/forms";
import { createSupplier, updateSupplier } from "../actions";
import { supplierFormSchema, type SupplierFormValues, type SupplierInput } from "../schemas";

type SupplierFormProps =
  | { mode: "create"; defaultValues: SupplierFormValues }
  | { mode: "edit"; defaultValues: SupplierFormValues; supplierId: string };

export function SupplierForm(props: SupplierFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SupplierFormValues, unknown, SupplierInput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: props.defaultValues,
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(() => {
    setFormError(null);
    // Raw values: the Server Action re-validates with the same schema.
    const values = form.getValues();
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createSupplier(values)
          : await updateSupplier(props.supplierId, values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />

      <Card>
        <CardHeader>
          <CardTitle>Datos del proveedor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Nombre o razón social"
            htmlFor="name"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              placeholder="Ej. Distribuidora Gráfica del Caribe"
              autoFocus={props.mode === "create"}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            label="Código"
            htmlFor="code"
            error={errors.code?.message}
            description="Opcional. Código interno, ej. PRV-001."
          >
            <Input
              id="code"
              autoComplete="off"
              className="uppercase placeholder:normal-case"
              placeholder="Opcional"
              {...form.register("code")}
            />
          </FormField>
          <FormField label="RNC / Cédula" htmlFor="taxId" error={errors.taxId?.message}>
            <Input
              id="taxId"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ej. 1-01-12345-6"
              {...form.register("taxId")}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Persona de contacto"
            htmlFor="contactName"
            error={errors.contactName?.message}
          >
            <Input id="contactName" autoComplete="off" {...form.register("contactName")} />
          </FormField>
          <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              autoComplete="off"
              placeholder="809-000-0000"
              {...form.register("phone")}
            />
          </FormField>
          <FormField label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              {...form.register("email")}
            />
          </FormField>
          <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
            <Input id="address" autoComplete="off" {...form.register("address")} />
          </FormField>
          <FormField
            label="Notas"
            htmlFor="notes"
            error={errors.notes?.message}
            className="md:col-span-2"
          >
            <Textarea
              id="notes"
              rows={3}
              placeholder="Condiciones de pago, tiempos de entrega…"
              {...form.register("notes")}
            />
          </FormField>
        </CardContent>
      </Card>

      {props.mode === "edit" && (
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
            <CardDescription>
              Un proveedor inactivo conserva su historial pero no aparece al registrar nuevas
              entradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <label
                  htmlFor="isActive"
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <span className="text-sm font-medium">Proveedor activo</span>
                  <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="outline" asChild>
          <Link href={props.mode === "edit" ? `/suppliers/${props.supplierId}` : "/suppliers"}>
            Cancelar
          </Link>
        </Button>
        <SubmitButton pending={pending} pendingText="Guardando…">
          {props.mode === "create" ? "Crear proveedor" : "Guardar cambios"}
        </SubmitButton>
      </div>
    </form>
  );
}
