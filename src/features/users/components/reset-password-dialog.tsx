"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRoundIcon } from "lucide-react";

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
import { applyActionErrors } from "@/lib/forms";
import { resetUserPassword } from "../actions";
import type { UserRow } from "../queries";
import {
  generateTemporaryPassword,
  resetPasswordSchema,
  type ResetPasswordValues,
} from "../schemas";
import { CredentialsNotice } from "./credentials-notice";
import { TemporaryPasswordField } from "./temporary-password-field";

export function ResetPasswordDialog({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues, unknown, unknown>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { temporaryPassword: "" },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset({ temporaryPassword: generateTemporaryPassword() });
    else {
      setNewPassword(null);
      setError(null);
    }
  }

  const onSubmit = form.handleSubmit(() => {
    setError(null);
    const values = form.getValues();
    startTransition(async () => {
      const result = await resetUserPassword(user.id, values);
      if (result.ok) setNewPassword(result.data.temporaryPassword);
      else setError(applyActionErrors(form, result));
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Restablecer contraseña de ${user.full_name}`}
        >
          <KeyRoundIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        {newPassword ? (
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Contraseña restablecida</DialogTitle>
              <DialogDescription>{user.full_name} deberá cambiarla al ingresar.</DialogDescription>
            </DialogHeader>
            <CredentialsNotice email={user.email} password={newPassword} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Listo</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Restablecer contraseña</DialogTitle>
              <DialogDescription>
                {user.full_name} ({user.email}) recibirá una contraseña temporal; la actual deja de
                funcionar.
              </DialogDescription>
            </DialogHeader>
            <FormError message={error} />
            <FormField
              label="Contraseña temporal"
              htmlFor="temporaryPassword"
              required
              error={form.formState.errors.temporaryPassword?.message}
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
              <SubmitButton pending={pending} pendingText="Restableciendo…">
                Restablecer
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
