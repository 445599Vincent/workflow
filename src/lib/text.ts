/** Lowercase without accents, for forgiving client-side search ("acrilico" finds "Acrílico"). */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
