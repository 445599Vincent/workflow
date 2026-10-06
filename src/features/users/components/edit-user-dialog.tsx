"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";

import { FormDialog } from "@/components/shared/form-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDialogForm } from "@/hooks/use-dialog-form";
import type { RoleCode } from "@/lib/auth/permissions";
import { updateUser } from "../actions";
import type { RoleOption, UserRow } from "../queries";
import { updateUserSchema, type UpdateUserValues } from "../schemas";
import { RoleSelect } from "./role-select";

export function EditUserDialog({
  user,
  roles,
  isSelf,
}: {
  user: UserRow;
  roles: RoleOption[];
  isSelf: boolean;
}) {
  const form = useForm<UpdateUserValues, unknown, unknown>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: user.full_name,
      roleCode: user.role_code as RoleCode,
      isActive: user.is_active,
    },
  });
  const dialog = useDialogForm(
    form,
    (values) => updateUser(user.id, values),
    "Usuario actualizado.",
  );
  const { errors } = form.formState;

  return (
    <FormDialog
      {...dialog}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${user.full_name}`}>
          <PencilIcon />
        </Button>
      }
      title="Editar usuario"
      description={
        isSelf
          ? "No puede cambiar su propio rol ni desactivarse; pídaselo a otro administrador."
          : user.email
      }
      submitLabel="Guardar cambios"
    >
      <FormField
        label="Nombre completo"
        htmlFor="fullName"
        required
        error={errors.fullName?.message}
      >
        <Input id="fullName" {...form.register("fullName")} />
      </FormField>
      <FormField label="Rol" htmlFor="roleCode" required error={errors.roleCode?.message}>
        <Controller
          control={form.control}
          name="roleCode"
          render={({ field }) => (
            <RoleSelect
              id="roleCode"
              roles={roles}
              value={field.value}
              onChange={field.onChange}
              disabled={isSelf}
            />
          )}
        />
      </FormField>
      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <label
            htmlFor="isActive"
            className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3"
          >
            <span className="space-y-1">
              <span className="block text-sm font-medium">Usuario activo</span>
              <span className="block text-xs text-muted-foreground">
                Un usuario inactivo no puede ingresar ni ver datos. Su historial se conserva.
              </span>
            </span>
            <Switch
              id="isActive"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isSelf}
            />
          </label>
        )}
      />
    </FormDialog>
  );
}
