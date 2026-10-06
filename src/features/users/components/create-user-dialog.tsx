"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlusIcon } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyActionErrors } from "@/lib/forms";
import { createUser } from "../actions";
import type { RoleOption } from "../queries";
import { createUserSchema, generateTemporaryPassword, type CreateUserValues } from "../schemas";
import { CredentialsNotice } from "./credentials-notice";
import { RoleSelect } from "./role-select";
import { TemporaryPasswordField } from "./temporary-password-field";

export function CreateUserDialog({ roles, disabled }: { roles: RoleOption[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const form = useForm<CreateUserValues, unknown, unknown>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: "", email: "", roleCode: "viewer", temporaryPassword: "" },
  });
  const { errors } = form.formState;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset({
        fullName: "",
        email: "",
        roleCode: "viewer",
        temporaryPassword: generateTemporaryPassword(),
      });
    } else {
      setCreated(null);
      setError(null);
    }
  }

  const onSubmit = form.handleSubmit(() => {
    setError(null);
    const values = form.getValues();
    startTransition(async () => {
      const result = await createUser(values);
      if (result.ok) setCreated({ email: result.data.email, password: values.temporaryPassword });
      else setError(applyActionErrors(form, result));
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <UserPlusIcon />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        {created ? (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Usuario creado</DialogTitle>
              <DialogDescription>Ya puede ingresar a Workflow con estos datos.</DialogDescription>
            </DialogHeader>
            <CredentialsNotice email={created.email} password={created.password} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Listo</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
              <DialogDescription>
                Se crea con una contraseña temporal que usted le compartirá; deberá cambiarla al
                ingresar.
              </DialogDescription>
            </DialogHeader>
            <FormError message={error} />
            <FormField
              label="Nombre completo"
              htmlFor="fullName"
              required
              error={errors.fullName?.message}
            >
              <Input id="fullName" autoComplete="off" autoFocus {...form.register("fullName")} />
            </FormField>
            <FormField
              label="Correo electrónico"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                {...form.register("email")}
              />
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
                  />
                )}
              />
            </FormField>
            <FormField
              label="Contraseña temporal"
              htmlFor="temporaryPassword"
              required
              error={errors.temporaryPassword?.message}
            >
              <TemporaryPasswordField
                registration={form.register("temporaryPassword")}
                onGenerate={() => form.setValue("temporaryPassword", generateTemporaryPassword())}
              />
            </FormField>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <SubmitButton pending={pending} pendingText="Creando…">
                Crear usuario
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
