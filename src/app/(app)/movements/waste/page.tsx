import type { Metadata } from "next";
import Link from "next/link";
import { ScissorsIcon, SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { WarehouseWasteDialog } from "@/features/inventory/components/warehouse-waste-dialog";
import { WasteFilters } from "@/features/inventory/components/waste-filters";
import { WasteList } from "@/features/inventory/components/waste-list";
import { listWaste } from "@/features/inventory/queries";
import { WASTE_PAGE_SIZE, parseWasteListParams } from "@/features/inventory/schemas";
import { listMaterialOptions } from "@/features/materials/queries";
import { can, requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Mermas" };

export default async function WastePage({ searchParams }: PageProps<"/movements/waste">) {
  const user = await requireUser();
  const params = parseWasteListParams(await searchParams);
  const canRegister = can(user, "inventory.adjust");
  const [result, materials] = await Promise.all([
    listWaste(params),
    canRegister ? listMaterialOptions() : Promise.resolve([]),
  ]);
  const isFiltered = params.scope !== "all" || Boolean(params.from || params.to);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/movements" className="hover:text-foreground">
            ← Movimientos
          </Link>
        }
        title="Mermas"
        description="Desperdicio de las órdenes de trabajo y del almacén. Las anuladas se muestran tachadas."
        actions={canRegister && <WarehouseWasteDialog materials={materials} />}
      />

      <WasteFilters />

      <p className="text-sm text-muted-foreground" data-testid="waste-total">
        Costo de merma{isFiltered ? " (con los filtros)" : ""}:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {formatMoney(result.activeCost)}
        </span>{" "}
        en {result.activeCount} {result.activeCount === 1 ? "registro" : "registros"} vigentes.
      </p>

      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <WasteList rows={result.rows} canVoid={can(user, "inventory.void")} />
        ) : isFiltered ? (
          <EmptyState
            icon={SearchXIcon}
            title="Ninguna merma coincide con los filtros"
            description="Pruebe con otro período u origen."
          />
        ) : (
          <EmptyState
            icon={ScissorsIcon}
            title="Aún no hay mermas"
            description="Las mermas registradas en órdenes o en el almacén aparecerán aquí."
          />
        )}
      </Card>

      {result.total > 0 && (
        <Pagination
          pathname="/movements/waste"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={WASTE_PAGE_SIZE}
          itemLabel="mermas"
        />
      )}
    </div>
  );
}
