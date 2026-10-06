"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  BookmarkMinusIcon,
  BookmarkPlusIcon,
  PackageCheckIcon,
  PencilIcon,
  ScissorsIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
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
import type { MaterialOption } from "@/features/materials/queries";
import { formatMoney, formatQuantityWithUnit } from "@/lib/format";
import { cn } from "@/lib/utils";
import { removePlannedMaterial } from "../actions";
import type { WorkOrderLine } from "../queries";
import {
  ConsumeDialog,
  PlannedQuantityDialog,
  ReleaseDialog,
  ReserveDialog,
  WasteDialog,
} from "./execution-dialogs";

/** What the current user may do on this order, already combined with its status. */
export type LineAbilities = {
  manage: boolean;
  reserve: boolean;
  consume: boolean;
};

export function WorkOrderLines({
  workOrderId,
  lines,
  materials,
  abilities,
}: {
  workOrderId: string;
  lines: WorkOrderLine[];
  materials: MaterialOption[];
  abilities: LineAbilities;
}) {
  return (
    <ul className="divide-y">
      {lines.map((line) => (
        <LineItem
          key={line.id}
          workOrderId={workOrderId}
          line={line}
          lines={lines}
          materials={materials}
          abilities={abilities}
        />
      ))}
    </ul>
  );
}

function LineItem({
  workOrderId,
  line,
  lines,
  materials,
  abilities,
}: {
  workOrderId: string;
  line: WorkOrderLine;
  lines: WorkOrderLine[];
  materials: MaterialOption[];
  abilities: LineAbilities;
}) {
  const quantity = (value: number) =>
    formatQuantityWithUnit(value, line.unitSymbol, line.unitDecimals);
  const overPlan = line.is_planned && line.usedQuantity > line.planned_quantity;
  const progress =
    line.planned_quantity > 0
      ? Math.min(100, (line.usedQuantity / line.planned_quantity) * 100)
      : 0;
  const pendingToReserve = line.planned_quantity - line.reserved_quantity - line.usedQuantity;
  const untouched = line.reserved_quantity === 0 && line.usedQuantity === 0;

  const facts: [string, string, string?][] = [
    ["Planificado", line.is_planned ? quantity(line.planned_quantity) : "—"],
    ["Reservado", quantity(line.reserved_quantity)],
    ["Consumido", quantity(line.consumed_quantity)],
    ["Merma", quantity(line.waste_quantity), line.waste_quantity > 0 ? "text-warning" : undefined],
  ];

  return (
    <li className="space-y-3 px-4 py-4 sm:px-6" data-testid="work-order-line">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/materials/${line.material_id}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {line.material.name}
            </Link>
            {!line.is_planned && <Badge variant="warning">No planificado</Badge>}
            {overPlan && <Badge variant="destructive">Excede lo planificado</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {line.material.sku}
            {line.notes ? ` · ${line.notes}` : ""}
          </p>
        </div>
        <div className="text-right text-sm tabular-nums">
          <p>
            <span className="text-muted-foreground">Est. </span>
            {formatMoney(line.estimated_total_cost)}
          </p>
          <p className="font-semibold">
            <span className="font-normal text-muted-foreground">Real </span>
            {formatMoney(line.actual_cost)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {facts.map(([label, value, className]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("font-medium tabular-nums", className)}>{value}</dd>
          </div>
        ))}
      </dl>

      {line.is_planned && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Usado respecto a lo planificado"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full", overPlan ? "bg-destructive" : "bg-success")}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {(abilities.reserve || abilities.consume || abilities.manage) && (
        <div className="flex flex-wrap items-center gap-2">
          {abilities.consume && (
            <>
              <ConsumeDialog
                workOrderId={workOrderId}
                line={line}
                lines={lines}
                materials={materials}
                trigger={
                  <Button size="sm">
                    <PackageCheckIcon />
                    Consumir
                  </Button>
                }
              />
              <WasteDialog
                workOrderId={workOrderId}
                line={line}
                lines={lines}
                materials={materials}
                trigger={
                  <Button size="sm" variant="outline">
                    <ScissorsIcon />
                    Merma
                  </Button>
                }
              />
            </>
          )}
          {abilities.reserve && line.is_planned && pendingToReserve > 0 && (
            <ReserveDialog
              line={line}
              trigger={
                <Button size="sm" variant="outline">
                  <BookmarkPlusIcon />
                  Reservar
                </Button>
              }
            />
          )}
          {abilities.reserve && line.reserved_quantity > 0 && (
            <ReleaseDialog
              line={line}
              trigger={
                <Button size="sm" variant="outline">
                  <BookmarkMinusIcon />
                  Liberar
                </Button>
              }
            />
          )}
          {abilities.manage && (
            <div className="ml-auto flex gap-1">
              <PlannedQuantityDialog
                line={line}
                trigger={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Cambiar cantidad estimada de ${line.material.name}`}
                    title="Cambiar cantidad estimada"
                  >
                    <PencilIcon />
                  </Button>
                }
              />
              {untouched && <RemoveLineDialog line={line} />}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function RemoveLineDialog({ line }: { line: WorkOrderLine }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await removePlannedMaterial(line.id);
      if (result.ok) {
        toast.success("Material quitado de la orden.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={`Quitar ${line.material.name}`}
          title="Quitar de la orden"
        >
          <Trash2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar {line.material.name}</DialogTitle>
          <DialogDescription>
            El material deja de estar planificado para esta orden. Queda registrado en el historial.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <SubmitButton
            type="button"
            variant="destructive"
            pending={pending}
            pendingText="Quitando…"
            onClick={remove}
          >
            Quitar
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
