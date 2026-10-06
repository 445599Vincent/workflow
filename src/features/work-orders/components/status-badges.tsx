import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_VARIANT,
  WORK_ORDER_PRIORITY,
  WORK_ORDER_STATUS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "../labels";

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const { label, variant } = WORK_ORDER_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{WORK_ORDER_PRIORITY[priority]}</Badge>;
}
