"use client";

import { useCallback } from "react";

import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/list-filters";
import { useUrlFilters } from "@/hooks/use-url-filters";
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
  const filters = useUrlFilters();
  const { navigate } = filters;
  const q = filters.get("q");
  const category = filters.get("category", ALL);
  const status = filters.get("status", "active");

  const onSearch = useCallback((value: string) => navigate({ q: value || null }), [navigate]);

  return (
    <FilterBar
      hasFilters={q !== "" || category !== ALL || status !== "active"}
      onReset={filters.reset}
    >
      <SearchInput
        key={filters.resetKey}
        defaultValue={q}
        onSearch={onSearch}
        pending={filters.pending}
        placeholder="Buscar por código o nombre…"
        label="Buscar materiales"
      />
      <div className="grid grid-cols-2 gap-3 md:flex">
        <FilterSelect
          label="Filtrar por categoría"
          className="md:w-52"
          value={category}
          options={[
            { value: ALL, label: "Todas las categorías" },
            ...categories.map((item) => ({ value: item.id, label: item.name })),
          ]}
          onChange={(value) => navigate({ category: value === ALL ? null : value })}
        />
        <FilterSelect
          label="Filtrar por estado"
          className="md:w-40"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => navigate({ status: value === "active" ? null : value })}
        />
      </div>
    </FilterBar>
  );
}
