"use client";

import { useCallback } from "react";

import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/list-filters";
import { useUrlFilters } from "@/hooks/use-url-filters";

const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "all", label: "Todos" },
];

export function SuppliersFilters() {
  const filters = useUrlFilters();
  const { navigate } = filters;
  const q = filters.get("q");
  const status = filters.get("status", "active");
  const onSearch = useCallback((value: string) => navigate({ q: value || null }), [navigate]);

  return (
    <FilterBar hasFilters={q !== "" || status !== "active"} onReset={filters.reset}>
      <SearchInput
        key={filters.resetKey}
        defaultValue={q}
        onSearch={onSearch}
        pending={filters.pending}
        placeholder="Buscar por nombre, código, RNC o contacto…"
        label="Buscar proveedores"
      />
      <FilterSelect
        label="Filtrar por estado"
        className="md:w-40"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(value) => navigate({ status: value === "active" ? null : value })}
      />
    </FilterBar>
  );
}
