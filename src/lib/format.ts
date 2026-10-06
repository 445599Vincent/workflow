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

/** Today's date (YYYY-MM-DD) in the business time zone. */
export function todayISODate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/** "lunes, 5 de octubre de 2026" */
export function formatLongDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "full", timeZone: TIME_ZONE }).format(value);
}

/**
 * Dates without time (e.g. due dates "2026-10-05") must not be shifted by the
 * time zone: format them from their parts.
 */
export function formatPlainDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** Elapsed time between two instants: "3 días 4 h", "5 h 20 min", "12 min". */
export function formatDuration(
  from: string | Date | null | undefined,
  to: string | Date = new Date(),
): string {
  if (!from) return "—";
  const minutes = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000),
  );
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0)
    return hours > 0
      ? `${days} ${days === 1 ? "día" : "días"} ${hours} h`
      : `${days} ${days === 1 ? "día" : "días"}`;
  if (hours > 0) return minutes % 60 > 0 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  return `${minutes} min`;
}
