"use client";

import { PackageCheckIcon, ScissorsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MaterialOption } from "@/features/materials/queries";
import type { WorkOrderLine } from "../queries";
import { ConsumeDialog, WasteDialog } from "./execution-dialogs";

/**
 * Consumption / waste of any material, planned or not (CON-02). The triggers
 * are built here, on the client: dialog triggers slot onto their child, which
 * must be a resolved element when the page refreshes after a status change.
 */
export function UsageQuickActions({
  workOrderId,
  lines,
  materials,
}: {
  workOrderId: string;
  lines: WorkOrderLine[];
  materials: MaterialOption[];
}) {
  return (
    <>
      <ConsumeDialog
        workOrderId={workOrderId}
        lines={lines}
        materials={materials}
        trigger={
          <Button size="sm" variant="outline">
            <PackageCheckIcon />
            Registrar consumo
          </Button>
        }
      />
      <WasteDialog
        workOrderId={workOrderId}
        lines={lines}
        materials={materials}
        trigger={
          <Button size="sm" variant="outline">
            <ScissorsIcon />
            Registrar merma
          </Button>
        }
      />
    </>
  );
}
