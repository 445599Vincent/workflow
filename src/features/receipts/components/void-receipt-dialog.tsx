"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BanIcon } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { applyActionErrors } from "@/lib/forms";
import { voidReceipt } from "../actions";
import { voidReceiptSchema, type VoidReceiptValues } from "../schemas";

export function VoidReceiptDialog({ receiptId, number }: { receiptId: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<VoidReceiptValues>({
    resolver: zodResolver(voidReceiptSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await voidReceipt(receiptId, values);
      setFormError(applyActionErrors(form, result));
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setFormError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <BanIcon />
          Anular entrada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Anular {number}</DialogTitle>
            <DialogDescription>
              Se descontará del inventario todo lo que ingresó con esta entrada y el costo promedio
              se recalculará. La entrada no se borra: queda marcada como anulada en el historial.
              Solo es posible si el material todavía está disponible.
            </DialogDescription>
          </DialogHeader>
          <FormError message={formError} />
          <FormField
            label="Motivo"
            htmlFor="reason"
            required
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="reason"
              rows={3}
              placeholder="Ej. Factura registrada dos veces"
              autoFocus
              {...form.register("reason")}
            />
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <SubmitButton pending={pending} pendingText="Anulando…" variant="destructive">
              Anular entrada
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
