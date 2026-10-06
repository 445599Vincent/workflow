"use client";

import { FilterBar, FilterSelect } from "@/components/shared/list-filters";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { AUDIT_ENTITIES } from "../labels";

const ALL = "all";
const ENTITY_OPTIONS = [
  { value: ALL, label: "Todas las entidades" },
  ...Object.entries(AUDIT_ENTITIES).map(([value, label]) => ({ value, label })),
];

export function AuditFilters() {
  const filters = useUrlFilters();
  const { navigate } = filters;
  const entity = filters.get("entity", ALL);
  const from = filters.get("from");
  const to = filters.get("to");

  return (
    <FilterBar hasFilters={entity !== ALL || from !== "" || to !== ""} onReset={filters.reset}>
      <FilterSelect
        label="Filtrar por entidad"
        className="md:w-60"
        value={entity}
        options={ENTITY_OPTIONS}
        onChange={(value) => navigate({ entity: value === ALL ? null : value })}
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
