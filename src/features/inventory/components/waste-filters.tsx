"use client";

import { FilterBar, FilterSelect } from "@/components/shared/list-filters";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { WASTE_SCOPES } from "../schemas";

const SCOPE_OPTIONS = Object.entries(WASTE_SCOPES).map(([value, label]) => ({ value, label }));

export function WasteFilters() {
  const filters = useUrlFilters();
  const { navigate } = filters;
  const scope = filters.get("scope", "all");
  const from = filters.get("from");
  const to = filters.get("to");

  return (
    <FilterBar hasFilters={scope !== "all" || from !== "" || to !== ""} onReset={filters.reset}>
      <FilterSelect
        label="Origen de la merma"
        className="md:w-60"
        value={scope}
        options={SCOPE_OPTIONS}
        onChange={(value) => navigate({ scope: value === "all" ? null : value })}
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
