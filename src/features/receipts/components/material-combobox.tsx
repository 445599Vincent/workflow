"use client";

import { useId, useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeForSearch } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { MaterialOption } from "../queries";

const MAX_RESULTS = 50;

type MaterialComboboxProps = {
  id?: string;
  materials: MaterialOption[];
  value: string;
  onChange: (material: MaterialOption) => void;
  invalid?: boolean;
};

/** Searchable material picker (code or name, accent-insensitive, keyboard friendly). */
export function MaterialCombobox({
  id,
  materials,
  value,
  onChange,
  invalid,
}: MaterialComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const selected = materials.find((material) => material.id === value);

  const results = useMemo(() => {
    const term = normalizeForSearch(query);
    const matches = term
      ? materials.filter(
          (material) =>
            normalizeForSearch(material.name).includes(term) ||
            normalizeForSearch(material.sku).includes(term),
        )
      : materials;
    return matches.slice(0, MAX_RESULTS);
  }, [materials, query]);

  function choose(material: MaterialOption) {
    onChange(material);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const material = results[activeIndex];
      if (material) choose(material);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">
            {selected ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{selected.sku}</span>{" "}
                {selected.name}
              </>
            ) : (
              "Buscar material…"
            )}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 p-0"
        onOpenAutoFocus={(event) => {
          // Focus the search box instead of the first focusable element.
          event.preventDefault();
          (event.currentTarget as HTMLElement).querySelector("input")?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Código o nombre…"
            aria-label="Buscar material"
            aria-controls={listId}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1">
          {results.length === 0 && (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">
              Ningún material activo coincide.
            </li>
          )}
          {results.map((material, index) => (
            <li
              key={material.id}
              role="option"
              aria-selected={material.id === value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(material)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                index === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              <CheckIcon
                className={cn(
                  "size-4 shrink-0",
                  material.id === value ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{material.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {material.sku} · {material.unitName}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
