import { Badge } from "@/components/ui/badge";
import { STOCK_STATUS, toStockStatus } from "@/features/inventory/labels";

export function StockStatusBadge({ status }: { status: string | null }) {
  const { label, variant } = STOCK_STATUS[toStockStatus(status)];
  return <Badge variant={variant}>{label}</Badge>;
}
