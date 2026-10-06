"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildHref } from "@/lib/url";
import type { MaterialStatusFilter } from "../schemas";

const ALL = "all";

const STATUS_OPTIONS: { value: MaterialStatusFilter; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "low", label: "Bajo mínimo" },
  { value: "out", label: "Sin existencia" },
  { value: "inactive", label: "Inactivos" },
  { value: "all", label: "Todos" },
];

type MaterialsFiltersProps = {
  categories: { id: string; name: string }[];
};

export function MaterialsFilters({ categories }: MaterialsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? ALL;
  const status = searchParams.get("status") ?? "active";
  const [search, setSearch] = useState(q);

  function navigate(updates: Record<string, string | null>) {
    const current = Object.fromEntries(searchParams.entries());
    startTransition(() => {
      router.replace(buildHref(pathname, current, updates), { scroll: false });
    });
  }

  // Debounced search: wait until the user stops typing.
  useEffect(() => {
    if (search.trim() === q) return;
    const timeout = setTimeout(() => navigate({ q: search.trim() || null }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const categoryLabel =
    categories.find((item) => item.id === category)?.name ?? "Todas las categorías";
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Activos";

  const hasFilters = q !== "" || category !== ALL || status !== "active";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative md:max-w-sm md:min-w-60 md:flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por código o nombre…"
          aria-label="Buscar materiales"
          className="pl-9"
        />
        {pending && (
          <LoaderCircleIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:flex">
        <Select
          value={category}
          onValueChange={(value) => navigate({ category: value === ALL ? null : value })}
        >
          <SelectTrigger className="md:w-52" aria-label="Filtrar por categoría">
            <SelectValue>{categoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => navigate({ status: value === "active" ? null : value })}
        >
          <SelectTrigger className="md:w-40" aria-label="Filtrar por estado">
            <SelectValue>{statusLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start md:self-auto"
          onClick={() => {
            setSearch("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <XIcon />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
