"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { applyActionErrors } from "@/lib/forms";
import { updatePassword } from "../actions";
import { MIN_PASSWORD_LENGTH, newPasswordSchema, type NewPasswordInput } from "../schemas";

export function ResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updatePassword(values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <FormError message={formError} />
      <FormField
        label="Nueva contraseña"
        htmlFor="password"
        error={errors.password?.message}
        description={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          autoFocus
          {...form.register("password")}
        />
      </FormField>
      <FormField
        label="Confirmar contraseña"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
      </FormField>
      <SubmitButton pending={pending} pendingText="Guardando…" size="lg" className="w-full">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
