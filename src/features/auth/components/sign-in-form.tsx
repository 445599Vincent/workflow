"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormError } from "@/components/shared/form-error";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { applyActionErrors } from "@/lib/forms";
import { signIn } from "../actions";
import { signInSchema, type SignInInput } from "../schemas";

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(initialError ?? null);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", next },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signIn(values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <FormError message={formError} />

      <FormField label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
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

      <div className="grid gap-2">
        <FormField label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
        </FormField>
        <Link
          href="/forgot-password"
          className="justify-self-end text-sm font-medium text-primary hover:underline"
        >
          ¿Olvidó su contraseña?
        </Link>
      </div>

      <SubmitButton pending={pending} pendingText="Ingresando…" size="lg" className="w-full">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
