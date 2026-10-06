"use client";

import { useState, useTransition } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions";
import { applyActionErrors } from "@/lib/forms";

/**
 * Open/pending/error state for a form inside a dialog: submits the raw values
 * to a Server Action, closes and confirms on success, maps errors otherwise.
 */
export function useDialogForm<TValues extends FieldValues, TOutput>(
  form: UseFormReturn<TValues, unknown, TOutput>,
  action: (values: TValues) => Promise<ActionResult>,
  successMessage: string,
) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset();
      setError(null);
    }
  };

  const onSubmit = form.handleSubmit(() => {
    setError(null);
    // Raw values: the Server Action re-validates with the same schema.
    const values = form.getValues();
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        toast.success(successMessage);
        onOpenChange(false);
      } else {
        setError(applyActionErrors(form, result));
      }
    });
  });

  return { open, onOpenChange, onSubmit, pending, error };
}
