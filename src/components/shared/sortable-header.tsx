import Link from "next/link";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { buildHref, type SearchParamValue } from "@/lib/url";
import { cn } from "@/lib/utils";

type SortableHeaderProps = {
  label: string;
  field: string;
  pathname: string;
  params: Record<string, SearchParamValue>;
  currentSort: string;
  currentDir: "asc" | "desc";
  align?: "left" | "right";
  className?: string;
};

/** Column header that toggles ?sort=field&dir=asc|desc. */
export function SortableHeader({
  label,
  field,
  pathname,
  params,
  currentSort,
  currentDir,
  align = "left",
  className,
}: SortableHeaderProps) {
  const active = currentSort === field;
  const nextDir = active && currentDir === "asc" ? "desc" : "asc";
  const Icon = !active ? ArrowUpDownIcon : currentDir === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead
      className={cn(align === "right" && "text-right", className)}
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link
        href={buildHref(pathname, params, { sort: field, dir: nextDir })}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-40")} />
      </Link>
    </TableHead>
  );
}
