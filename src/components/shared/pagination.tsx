import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildHref, type SearchParamValue } from "@/lib/url";

type PaginationProps = {
  pathname: string;
  params: Record<string, SearchParamValue>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  itemLabel?: string;
};

export function Pagination({
  pathname,
  params,
  page,
  pageCount,
  total,
  pageSize,
  itemLabel = "registros",
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <p className="tabular-nums">
        {first}–{last} de {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <PageLink
          href={buildHref(pathname, params, { page: page - 1 })}
          disabled={page <= 1}
          label="Página anterior"
        >
          <ChevronLeftIcon />
        </PageLink>
        <span className="px-1 tabular-nums">
          Página {page} de {pageCount}
        </span>
        <PageLink
          href={buildHref(pathname, params, { page: page + 1 })}
          disabled={page >= pageCount}
          label="Página siguiente"
        >
          <ChevronRightIcon />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon-sm" asChild>
      <Link href={href} aria-label={label} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}
