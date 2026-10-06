"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Shown once after creating an account or resetting a password: the
 * administrator copies the credentials and hands them to the person.
 */
export function CredentialsNotice({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Workflow\nCorreo: ${email}\nContraseña temporal: ${password}\nDeberá cambiarla al ingresar.`;

  return (
    <div className="grid gap-4">
      <Alert variant="info">
        <KeyRoundIcon />
        <AlertTitle>Comparta estos datos de acceso</AlertTitle>
        <AlertDescription>
          La contraseña no se volverá a mostrar. Al ingresar, el sistema le pedirá elegir una nueva.
        </AlertDescription>
      </Alert>
      <dl className="grid gap-2 rounded-lg border bg-muted/50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Correo</dt>
          <dd className="font-medium break-all">{email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Contraseña temporal</dt>
          <dd className="font-mono font-semibold">{password}</dd>
        </div>
      </dl>
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copiado" : "Copiar datos de acceso"}
      </Button>
    </div>
  );
}
