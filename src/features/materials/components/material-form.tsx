"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { QuantityInput } from "@/components/shared/quantity-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import { applyActionErrors } from "@/lib/forms";
import { decimalsHint, exceedsDecimals } from "@/lib/validation";
import { createMaterial, updateMaterial } from "../actions";
import type { MaterialFormOptions } from "../queries";
import { createMaterialSchema, updateMaterialSchema, type MaterialFormValues } from "../schemas";

const NONE = "none";

type MaterialFormProps =
  | { mode: "create"; options: MaterialFormOptions; defaultValues: MaterialFormValues }
  | {
      mode: "edit";
      options: MaterialFormOptions;
      defaultValues: MaterialFormValues;
      materialId: string;
      sku: string;
      hasMovements: boolean;
    };

/** Active options, plus the currently selected one even if it was deactivated. */
function visibleOptions<T extends { id: string; is_active: boolean }>(
  items: T[],
  selected: string,
) {
  return items.filter((item) => item.is_active || item.id === selected);
}

export function MaterialForm(props: MaterialFormProps) {
  const { mode, options, defaultValues } = props;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = mode === "create" ? createMaterialSchema : updateMaterialSchema;
  const form = useForm<MaterialFormValues>({
    // Each mode validates with its own schema; both accept MaterialFormValues.
    resolver: zodResolver(schema) as unknown as Resolver<MaterialFormValues>,
    defaultValues,
  });
  const { errors } = form.formState;

  const [baseUnitId, openingQuantity, openingUnitCost, categoryId, locationId, supplierId] =
    useWatch({
      control: form.control,
      name: [
        "baseUnitId",
        "openingQuantity",
        "openingUnitCost",
        "categoryId",
        "locationId",
        "primarySupplierId",
      ],
    });
  const unit = options.units.find((item) => item.id === baseUnitId);
  const unitSuffix = unit ? unit.symbol : "";
  const quantityHint = unit
    ? `En ${unit.name.toLowerCase()} · ${decimalsHint(unit.decimals)}`
    : "Seleccione primero la unidad de medida";
  const openingTotal = Number(openingQuantity || 0) * Number(openingUnitCost || 0);

  const onSubmit = form.handleSubmit(() => {
    setFormError(null);
    // Send the raw text values: the Server Action re-validates with the same schema.
    const values = form.getValues();
    // Unit precision is enforced by the database too; flag it on the field first.
    if (unit && values.openingQuantity && exceedsDecimals(values.openingQuantity, unit.decimals)) {
      form.setError("openingQuantity", {
        type: "precision",
        message: `${unit.name}: ${decimalsHint(unit.decimals)}.`,
      });
      return;
    }
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createMaterial(values)
          : await updateMaterial(props.materialId, values);
      setFormError(applyActionErrors(form, result));
    });
  });

  const cancelHref = props.mode === "edit" ? `/materials/${props.materialId}` : "/materials";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={formError} />

      <Card>
        <CardHeader>
          <CardTitle>Identificación</CardTitle>
          <CardDescription>Cómo se reconoce el material en el almacén.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {props.mode === "create" ? (
            <FormField
              label="Código (SKU)"
              htmlFor="sku"
              error={errors.sku?.message}
              description="Déjelo vacío para generarlo automáticamente (MAT-0001)."
            >
              <Input
                id="sku"
                autoComplete="off"
                placeholder="Automático"
                className="uppercase placeholder:normal-case"
                {...form.register("sku")}
              />
            </FormField>
          ) : (
            <FormField
              label="Código (SKU)"
              htmlFor="sku"
              description="El código no se puede cambiar."
            >
              <Input id="sku" value={props.sku} disabled readOnly />
            </FormField>
          )}

          <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
            <Input
              id="name"
              placeholder="Ej. Vinil blanco brillante 1.52 m"
              autoFocus={mode === "create"}
              {...form.register("name")}
            />
          </FormField>

          <FormField
            label="Categoría"
            htmlFor="categoryId"
            required
            error={errors.categoryId?.message}
          >
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="categoryId"
                    aria-invalid={Boolean(errors.categoryId) || undefined}
                  >
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleOptions(options.categories, categoryId).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
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
              rows={3}
              placeholder="Medidas, color, marca, uso habitual…"
              {...form.register("description")}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control de inventario</CardTitle>
          <CardDescription>Unidad en que se controla el stock y niveles de alerta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Unidad base de inventario"
            htmlFor="baseUnitId"
            required
            error={errors.baseUnitId?.message}
            description={
              props.mode === "edit" && props.hasMovements
                ? "No se puede cambiar: el material ya tiene movimientos."
                : "Ej. el vinil se compra en rollos pero se controla en m²."
            }
          >
            <Controller
              control={form.control}
              name="baseUnitId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={props.mode === "edit" && props.hasMovements}
                >
                  <SelectTrigger
                    id="baseUnitId"
                    aria-invalid={Boolean(errors.baseUnitId) || undefined}
                  >
                    <SelectValue placeholder="Seleccione la unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleOptions(options.units, baseUnitId).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Ubicación" htmlFor="locationId" error={errors.locationId?.message}>
            <Controller
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <SelectTrigger id="locationId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin ubicación</SelectItem>
                    {visibleOptions(options.locations, locationId).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Stock mínimo"
            htmlFor="minStock"
            required
            error={errors.minStock?.message}
            description="Al llegar a este nivel disponible se genera una alerta."
          >
            <QuantityInput id="minStock" suffix={unitSuffix} {...form.register("minStock")} />
          </FormField>

          <FormField
            label="Stock máximo"
            htmlFor="maxStock"
            error={errors.maxStock?.message}
            description="Opcional."
          >
            <QuantityInput
              id="maxStock"
              suffix={unitSuffix}
              placeholder="—"
              {...form.register("maxStock")}
            />
          </FormField>

          <FormField
            label="Proveedor principal"
            htmlFor="primarySupplierId"
            error={errors.primarySupplierId?.message}
          >
            <Controller
              control={form.control}
              name="primarySupplierId"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <SelectTrigger id="primarySupplierId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin proveedor principal</SelectItem>
                    {visibleOptions(options.suppliers, supplierId).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <SwitchField
            control={form.control}
            name="tracksRemnants"
            label="Controla retazos"
            description="Para materiales en lámina o rollo cuyos sobrantes se reutilizan (próximamente)."
          />
        </CardContent>
      </Card>

      {props.mode === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle>Existencia inicial</CardTitle>
            <CardDescription>
              Opcional. Si ya hay material en el almacén, regístrelo aquí; quedará como ajuste de
              “Inventario inicial” en el kardex.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <FormField
              label="Cantidad"
              htmlFor="openingQuantity"
              error={errors.openingQuantity?.message}
              description={quantityHint}
            >
              <QuantityInput
                id="openingQuantity"
                suffix={unitSuffix}
                placeholder="0"
                {...form.register("openingQuantity")}
              />
            </FormField>
            <FormField
              label="Costo unitario (RD$)"
              htmlFor="openingUnitCost"
              error={errors.openingUnitCost?.message}
              description={unit ? `Por ${unit.symbol}` : undefined}
            >
              <QuantityInput
                id="openingUnitCost"
                placeholder="0.00"
                {...form.register("openingUnitCost")}
              />
            </FormField>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Valor inicial</span>
              <p className="flex h-9 items-center rounded-md bg-muted px-3 text-sm font-semibold tabular-nums">
                {Number.isFinite(openingTotal) ? formatMoney(openingTotal) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
            <CardDescription>
              Un material inactivo conserva su historial pero no admite entradas, reservas ni
              consumos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SwitchField control={form.control} name="isActive" label="Material activo" />
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <SubmitButton pending={pending} pendingText="Guardando…">
          {mode === "create" ? "Crear material" : "Guardar cambios"}
        </SubmitButton>
      </div>
    </form>
  );
}

function SwitchField({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<typeof useForm<MaterialFormValues>>["control"];
  name: "tracksRemnants" | "isActive";
  label: string;
  description?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label
          htmlFor={name}
          className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3"
        >
          <span className="space-y-1">
            <span className="block text-sm font-medium">{label}</span>
            {description && (
              <span className="block text-xs text-muted-foreground">{description}</span>
            )}
          </span>
          <Switch id={name} checked={field.value} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );
}
