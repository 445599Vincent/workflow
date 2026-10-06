import { Badge } from "@/components/ui/badge";

export function ReceiptStatusBadge({ voided }: { voided: boolean }) {
  return voided ? (
    <Badge variant="destructive">Anulada</Badge>
  ) : (
    <Badge variant="success">Registrada</Badge>
  );
}
