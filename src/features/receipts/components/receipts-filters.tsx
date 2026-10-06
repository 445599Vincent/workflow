"use client";

import { useCallback } from "react";

import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/list-filters";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/use-url-filters";

const ALL = "all";

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "posted", label: "Registradas" },
  { value: "voided", label: "Anuladas" },
];

export function ReceiptsFilters({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const filters = useUrlFilters();
  const { navigate } = filters;
  const q = filters.get("q");
  const supplier = filters.get("supplier", ALL);
  const status = filters.get("status", ALL);
  const from = filters.get("from");
  const to = filters.get("to");
  const onSearch = useCallback((value: string) => navigate({ q: value || null }), [navigate]);

  return (
    <FilterBar
      hasFilters={q !== "" || supplier !== ALL || status !== ALL || from !== "" || to !== ""}
      onReset={filters.reset}
    >
      <SearchInput
        key={filters.resetKey}
        defaultValue={q}
        onSearch={onSearch}
        pending={filters.pending}
        placeholder="Número de entrada o factura…"
        label="Buscar entradas"
      />
      <div className="grid grid-cols-2 gap-3 md:flex">
        <FilterSelect
          label="Filtrar por proveedor"
          className="md:w-56"
          value={supplier}
          options={[
            { value: ALL, label: "Todos los proveedores" },
            ...suppliers.map((item) => ({ value: item.id, label: item.name })),
          ]}
          onChange={(value) => navigate({ supplier: value === ALL ? null : value })}
        />
        <FilterSelect
          label="Filtrar por estado"
          className="md:w-36"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => navigate({ status: value === ALL ? null : value })}
        />
      </div>
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
