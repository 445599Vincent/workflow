/** Removes characters with meaning in PostgREST filter syntax (or=, ilike). */
export function sanitizeSearch(term: string): string {
  return term.replace(/[%*,()"\\]/g, " ").trim();
}
