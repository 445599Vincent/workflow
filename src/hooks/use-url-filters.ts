"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildHref } from "@/lib/url";

/**
 * List filters live in the URL (shareable links, working back button, server
 * rendering). This hook reads them and replaces the URL on change; changing a
 * filter resets pagination.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Changes on reset so uncontrolled inputs (search box) remount empty.
  const [resetKey, setResetKey] = useState(0);

  const get = useCallback(
    (key: string, fallback = ""): string => searchParams.get(key) ?? fallback,
    [searchParams],
  );

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const current = Object.fromEntries(searchParams.entries());
      startTransition(() => {
        router.replace(buildHref(pathname, current, updates), { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const reset = useCallback(() => {
    setResetKey((key) => key + 1);
    startTransition(() => router.replace(pathname, { scroll: false }));
  }, [pathname, router]);

  return { get, navigate, reset, pending, resetKey };
}
