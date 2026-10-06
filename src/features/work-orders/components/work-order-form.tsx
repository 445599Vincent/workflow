"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyActionErrors } from "@/lib/forms";
import { createWorkOrder, updateWorkOrder } from "../actions";
import { WORK_ORDER_PRIORITY, type WorkOrderPriority } from "../labels";
import type { WorkOrderFormOptions } from "../queries";
import { workOrderFormSchema, type WorkOrderFormValues } from "../schemas";

const NONE = "none";

type WorkOrderFormProps =
  | { mode: "create"; options: WorkOrderFormOptions; defaultValues: WorkOrderFormValues }
  | {
      mode: "edit";
      options: WorkOrderFormOptions;
      defaultValues: WorkOrderFormValues;
      workOrderId: string;
    };

function OptionalSelect({
  id,
  value,
  onChange,
  noneLabel,
  items,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  noneLabel: string;
  items: { id: string; label: string }[];
}) {
  const selected = items.find((item) => item.id === value);
  return (
    <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
      <SelectTrigger id={id}>
        <SelectValue>{selected?.label ?? noneLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function WorkOrderForm(props: WorkOrderFormProps) {
  const { options, defaultValues } = props;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<WorkOrderFormValues, unknown, unknown>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues,
  });
  const { errors } = form.formState;

  const customers = options.customers
    .filter((item) => item.is_active || item.id === defaultValues.customerId)
    .map((item) => ({ id: item.id, label: item.name }));
  const people = options.people.map((item) => ({ id: item.id, label: item.full_name }));

  const onSubmit = form.handleSubmit(() => {
    setFormError(null);
    const values = form.getValues();
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createWorkOrder(values)
          : await updateWorkOrder(props.workOrderId, values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />
      <Card>
        <CardHeader>
          <CardTitle>Trabajo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Nombre del trabajo"
            htmlFor="title"
            required
            error={errors.title?.message}
            className="md:col-span-2"
          >
            <Input
              id="title"
              placeholder="Ej. Fabricación e instalación de letrero exterior"
              autoFocus={props.mode === "create"}
              {...form.register("title")}
            />
          </FormField>
          <FormField label="Cliente" htmlFor="customerId" error={errors.customerId?.message}>
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <OptionalSelect
                  id="customerId"
                  value={field.value}
                  onChange={field.onChange}
                  noneLabel="Sin cliente"
                  items={customers}
                />
              )}
            />
          </FormField>
          <FormField
            label="Responsable"
            htmlFor="responsibleId"
            error={errors.responsibleId?.message}
          >
            <Controller
              control={form.control}
              name="responsibleId"
              render={({ field }) => (
                <OptionalSelect
                  id="responsibleId"
                  value={field.value}
                  onChange={field.onChange}
                  noneLabel="Sin asignar"
                  items={people}
                />
              )}
            />
          </FormField>
          <FormField label="Fecha requerida" htmlFor="dueDate" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...form.register("dueDate")} />
          </FormField>
          <FormField label="Prioridad" htmlFor="priority" error={errors.priority?.message}>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority">
                    <SelectValue>
                      {WORK_ORDER_PRIORITY[field.value as WorkOrderPriority]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORK_ORDER_PRIORITY).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Descripción"
            htmlFor="description"
            error={errors.description?.message}
            className="md:col-span-2"
          >
            <Textarea
              id="description"
              rows={4}
              placeholder="Medidas, materiales, lugar de instalación, observaciones del cliente…"
              {...form.register("description")}
            />
          </FormField>
          {props.mode === "create" && (
            <FormField
              label="Estado inicial"
              htmlFor="initialStatus"
              description="Borrador: aún en cotización o definición. Pendiente: aprobada, por planificar."
            >
              <Controller
                control={form.control}
                name="initialStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="initialStatus">
                      <SelectValue>
                        {field.value === "draft" ? "Borrador" : "Pendiente"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="outline" asChild>
          <Link href={props.mode === "edit" ? `/work-orders/${props.workOrderId}` : "/work-orders"}>
            Cancelar
          </Link>
        </Button>
        <SubmitButton pending={pending} pendingText="Guardando…">
          {props.mode === "create" ? "Crear orden" : "Guardar cambios"}
        </SubmitButton>
      </div>
    </form>
  );
}
