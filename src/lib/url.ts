export type SearchParamValue = string | number | null | undefined;

/**
 * Builds `pathname?query` from current params plus updates. Updating any
 * filter resets pagination unless `page` is part of the update.
 */
export function buildHref(
  pathname: string,
  current: Record<string, SearchParamValue>,
  updates: Record<string, SearchParamValue> = {},
): string {
  const params = new URLSearchParams();
  const merged: Record<string, SearchParamValue> = { ...current, ...updates };
  if (!("page" in updates)) delete merged.page;

  for (const [key, value] of Object.entries(merged)) {
    if (value === null || value === undefined || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
