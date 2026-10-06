"use client";

import { RefreshCwIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Visible text field (it will be shared with the user) plus a generator. */
export function TemporaryPasswordField({
  registration,
  onGenerate,
}: {
  registration: UseFormRegisterReturn;
  onGenerate: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        id="temporaryPassword"
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
        {...registration}
      />
      <Button type="button" variant="outline" onClick={onGenerate}>
        <RefreshCwIcon />
        Generar
      </Button>
    </div>
  );
}
