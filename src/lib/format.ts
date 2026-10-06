/**
 * Formatting helpers for Dominican Spanish (es-DO). Keep all number, money
 * and date presentation here so the whole app is consistent.
 */
const LOCALE = "es-DO";
export const CURRENCY_SYMBOL = "RD$";
export const TIME_ZONE = "America/Santo_Domingo";

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatters = new Map<number, Intl.NumberFormat>();

function quantityFormatter(decimals: number) {
  let formatter = quantityFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    quantityFormatters.set(decimals, formatter);
  }
  return formatter;
}

/** RD$1,234.50 */
export function formatMoney(value: number | null | undefined): string {
  return `${CURRENCY_SYMBOL}${moneyFormatter.format(value ?? 0)}`;
}

/** 125.5 → "125.5"; respects the unit's allowed decimals. */
export function formatQuantity(value: number | null | undefined, decimals = 4): string {
  return quantityFormatter(decimals).format(value ?? 0);
}

/** 125.5, "m²" → "125.5 m²" */
export function formatQuantityWithUnit(
  value: number | null | undefined,
  unitSymbol: string | null | undefined,
  decimals = 4,
): string {
  const quantity = formatQuantity(value, decimals);
  return unitSymbol ? `${quantity} ${unitSymbol}` : quantity;
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value ?? 0);
}

/** 06/10/2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** 06/10/2026 3:45 p. m. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** "Ana Pérez" → "AP" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? "?"];
  return letters
    .map((part) => part?.charAt(0) ?? "")
    .join("")
    .toUpperCase();
}
