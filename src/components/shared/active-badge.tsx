import { Badge } from "@/components/ui/badge";

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>;
}
