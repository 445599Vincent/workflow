"use client";

import { useCallback } from "react";

import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/list-filters";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { WORK_ORDER_STATUS } from "../labels";

const ALL = "all";
const STATUS_OPTIONS = [
  { value: "open", label: "Abiertas" },
  { value: "overdue", label: "Atrasadas" },
  ...Object.entries(WORK_ORDER_STATUS).map(([value, { label }]) => ({ value, label })),
  { value: ALL, label: "Todas" },
];

export function WorkOrdersFilters({ customers }: { customers: { id: string; name: string }[] }) {
  const filters = useUrlFilters();
  const { navigate } = filters;
  const q = filters.get("q");
  const status = filters.get("status", "open");
  const customer = filters.get("customer", ALL);
  const onSearch = useCallback((value: string) => navigate({ q: value || null }), [navigate]);

  return (
    <FilterBar
      hasFilters={q !== "" || status !== "open" || customer !== ALL}
      onReset={filters.reset}
    >
      <SearchInput
        key={filters.resetKey}
        defaultValue={q}
        onSearch={onSearch}
        pending={filters.pending}
        placeholder="Número de OT o nombre del trabajo…"
        label="Buscar órdenes"
      />
      <div className="grid grid-cols-2 gap-3 md:flex">
        <FilterSelect
          label="Filtrar por estado"
          className="md:w-44"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => navigate({ status: value === "open" ? null : value })}
        />
        <FilterSelect
          label="Filtrar por cliente"
          className="md:w-56"
          value={customer}
          options={[
            { value: ALL, label: "Todos los clientes" },
            ...customers.map((item) => ({ value: item.id, label: item.name })),
          ]}
          onChange={(value) => navigate({ customer: value === ALL ? null : value })}
        />
      </div>
    </FilterBar>
  );
}
