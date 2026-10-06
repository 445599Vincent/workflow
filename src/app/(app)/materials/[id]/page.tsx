import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagePlusIcon, PencilIcon } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KardexTable } from "@/features/materials/components/kardex-table";
import {
  MaterialCosts,
  MaterialDetails,
  StockOverview,
} from "@/features/materials/components/material-summary";
import { StockStatusBadge } from "@/features/materials/components/stock-status-badge";
import { getMaterial, getMaterialKardex, KARDEX_LIMIT } from "@/features/materials/queries";
import { can, requireUser } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: PageProps<"/materials/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "Material" };
  const material = await getMaterial(id);
  return { title: material?.name ?? "Material" };
}

export default async function MaterialPage({ params }: PageProps<"/materials/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  const [material, kardex] = await Promise.all([getMaterial(id), getMaterialKardex(id)]);
  if (!material) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/materials" className="hover:text-foreground">
            ← Materias primas
          </Link>
        }
        title={material.name ?? ""}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{material.sku}</span>
            <span aria-hidden>·</span>
            <span>{material.category_name}</span>
            <StockStatusBadge status={material.stock_status} />
          </span>
        }
        actions={
          <>
            {can(user, "inventory.receive") && material.is_active && (
              <Button asChild>
                <Link href={`/receipts/new?material=${id}`}>
                  <PackagePlusIcon />
                  Registrar entrada
                </Link>
              </Button>
            )}
            {can(user, "materials.manage") && (
              <Button variant="outline" asChild>
                <Link href={`/materials/${id}/edit`}>
                  <PencilIcon />
                  Editar
                </Link>
              </Button>
            )}
          </>
        }
      />

      <StockOverview material={material} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MaterialDetails material={material} />
        <MaterialCosts material={material} />
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Kardex</CardTitle>
          <CardDescription>
            Historial de movimientos, del más reciente al más antiguo
            {kardex.length === KARDEX_LIMIT ? ` (últimos ${KARDEX_LIMIT})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="border-t px-0">
          <KardexTable
            rows={kardex}
            unitSymbol={material.unit_symbol ?? ""}
            decimals={material.unit_decimals ?? 4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
