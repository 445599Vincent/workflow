"use client";

import { useCallback } from "react";

import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/list-filters";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { MOVEMENT_TYPES } from "../labels";

const ALL = "all";
const TYPE_OPTIONS = [
  { value: ALL, label: "Todos los tipos" },
  ...Object.entries(MOVEMENT_TYPES).map(([value, { label }]) => ({ value, label })),
];

export function MovementsFilters() {
  const filters = useUrlFilters();
  const { navigate } = filters;
  const q = filters.get("q");
  const type = filters.get("type", ALL);
  const from = filters.get("from");
  const to = filters.get("to");
  const onSearch = useCallback((value: string) => navigate({ q: value || null }), [navigate]);

  return (
    <FilterBar
      hasFilters={q !== "" || type !== ALL || from !== "" || to !== ""}
      onReset={filters.reset}
    >
      <SearchInput
        key={filters.resetKey}
        defaultValue={q}
        onSearch={onSearch}
        pending={filters.pending}
        placeholder="Material, referencia u OT…"
        label="Buscar movimientos"
      />
      <FilterSelect
        label="Filtrar por tipo de movimiento"
        className="md:w-52"
        value={type}
        options={TYPE_OPTIONS}
        onChange={(value) => navigate({ type: value === ALL ? null : value })}
      />
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center">
        <Input
          key={`from-${filters.resetKey}`}
          type="date"
          aria-label="Desde"
          defaultValue={from}
          max={to || undefined}
          onChange={(event) => navigate({ from: event.target.value || null })}
          className="md:w-40"
        />
        <Input
          key={`to-${filters.resetKey}`}
          type="date"
          aria-label="Hasta"
          defaultValue={to}
          min={from || undefined}
          onChange={(event) => navigate({ to: event.target.value || null })}
          className="md:w-40"
        />
      </div>
    </FilterBar>
  );
}
