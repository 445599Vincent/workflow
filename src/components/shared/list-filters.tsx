"use client";

import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

/** Search box that reports its value after the user stops typing. */
export function SearchInput({
  defaultValue,
  onSearch,
  pending,
  placeholder,
  label,
}: {
  defaultValue: string;
  onSearch: (value: string) => void;
  pending?: boolean;
  placeholder: string;
  label: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const lastSent = useRef(defaultValue);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === lastSent.current) return;
    const timeout = setTimeout(() => {
      lastSent.current = trimmed;
      onSearch(trimmed);
    }, 350);
    return () => clearTimeout(timeout);
  }, [value, onSearch]);

  return (
    <div className="relative md:max-w-sm md:min-w-60 md:flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
      {pending && (
        <LoaderCircleIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export type FilterOption = { value: string; label: string };

/**
 * Select bound to a URL filter. The label is rendered explicitly so it shows
 * correctly before hydration (Radix only fills SelectValue on the client).
 */
export function FilterSelect({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  return (
    <Select value={selected?.value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={label}>
        <SelectValue>{selected?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Layout for a list's filters plus a "clear" button when any is active. */
export function FilterBar({
  children,
  hasFilters,
  onReset,
  className,
}: {
  children: React.ReactNode;
  hasFilters: boolean;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center", className)}>
      {children}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="self-start md:self-auto" onClick={onReset}>
          <XIcon />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
