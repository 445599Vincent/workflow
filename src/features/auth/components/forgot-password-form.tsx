"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyActionErrors } from "@/lib/forms";
import { requestPasswordReset } from "../actions";
import { passwordResetRequestSchema, type PasswordResetRequestInput } from "../schemas";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (result.ok) setSentTo(values.email);
      else setFormError(applyActionErrors(form, result));
    });
  });

  if (sentTo) {
    return (
      <div className="grid gap-5 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/12 text-success">
          <MailCheckIcon className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          Si <span className="font-medium text-foreground">{sentTo}</span> tiene una cuenta,
          recibirá un correo con un enlace para crear una nueva contraseña.
        </p>
        <Button variant="outline" asChild>
          <Link href="/login">Volver a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <FormError message={formError} />
      <FormField
        label="Correo electrónico"
        htmlFor="email"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@empresa.com"
          autoFocus
          {...form.register("email")}
        />
      </FormField>
      <SubmitButton pending={pending} pendingText="Enviando…" size="lg" className="w-full">
        Enviar enlace de recuperación
      </SubmitButton>
      <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
