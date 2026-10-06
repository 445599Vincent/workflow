import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import type { ActionResult } from "@/lib/actions";

/**
 * Copies server-side validation errors onto react-hook-form fields and returns
 * the general error message (if any) to show above the form.
 */
export function applyActionErrors<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "setError">,
  result: ActionResult<unknown> | undefined,
): string | null {
  if (!result || result.ok) return null;
  for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
    const message = messages?.[0];
    if (message) form.setError(field as Path<T>, { type: "server", message });
  }
  return result.error;
}
