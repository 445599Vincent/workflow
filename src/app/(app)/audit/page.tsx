import type { Metadata } from "next";
import { SearchXIcon, ShieldCheckIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditList } from "@/features/audit/components/audit-list";
import { listAuditLogs } from "@/features/audit/queries";
import { AUDIT_PAGE_SIZE, parseAuditListParams } from "@/features/audit/schemas";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Auditoría" };

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requirePermission("audit.view");
  const params = parseAuditListParams(await searchParams);
  const result = await listAuditLogs(params);
  const isFiltered = Boolean(params.entity || params.from || params.to);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description="Quién cambió qué y cuándo. El registro no se puede modificar ni borrar."
      />
      <AuditFilters />
      <Card className="gap-0 overflow-hidden py-0">
        {result.rows.length > 0 ? (
          <AuditList rows={result.rows} />
        ) : (
          <EmptyState
            icon={isFiltered ? SearchXIcon : ShieldCheckIcon}
            title={
              isFiltered ? "Ningún registro coincide con los filtros" : "Sin registros todavía"
            }
          />
        )}
      </Card>
      {result.total > 0 && (
        <Pagination
          pathname="/audit"
          params={{ ...params }}
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={AUDIT_PAGE_SIZE}
          itemLabel="registros"
        />
      )}
    </div>
  );
}
