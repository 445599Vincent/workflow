"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** One-shot confirmations passed through the URL after a redirect (?notice=...). */
const NOTICES: Record<string, string> = {
  "password-updated": "Contraseña actualizada correctamente.",
  "material-created": "Material creado correctamente.",
  "material-updated": "Cambios guardados.",
  "supplier-created": "Proveedor creado correctamente.",
  "supplier-updated": "Cambios guardados.",
  "receipt-posted": "Entrada registrada. El inventario se actualizó.",
  "receipt-voided": "Entrada anulada. El inventario se revirtió.",
  "adjustment-created": "Ajuste registrado. Puede verlo en el kardex.",
  "catalog-saved": "Cambios guardados.",
  "work-order-created": "Orden creada. Agregue los materiales planificados.",
  "work-order-updated": "Cambios guardados.",
};

export function FlashMessage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notice = searchParams.get("notice");

  useEffect(() => {
    if (!notice) return;
    const message = NOTICES[notice];
    if (message) toast.success(message);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("notice");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [notice, pathname, router, searchParams]);

  return null;
}
