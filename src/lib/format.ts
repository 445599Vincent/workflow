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

const EMPTY = "—";

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Valid dates only: an invalid value would make Intl throw and take the page down. */
function toDate(value: string | Date): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "1 material" / "3 materiales" (zero takes the plural, as in Spanish). */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatQuantity(count, 0)} ${count === 1 ? singular : plural}`;
}

/** RD$1,234.50 · -RD$42.50 · "—" when the value is missing or not a number. */
export function formatMoney(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY;
  const formatted = `${CURRENCY_SYMBOL}${moneyFormatter.format(Math.abs(value))}`;
  return value < 0 && Math.abs(value) >= 0.005 ? `-${formatted}` : formatted;
}

/** 125.5 → "125.5"; respects the unit's allowed decimals. */
export function formatQuantity(value: number | null | undefined, decimals = 4): string {
  return isNumber(value) ? quantityFormatter(decimals).format(value) : EMPTY;
}

/** 125.5, "m²" → "125.5 m²" */
export function formatQuantityWithUnit(
  value: number | null | undefined,
  unitSymbol: string | null | undefined,
  decimals = 4,
): string {
  const quantity = formatQuantity(value, decimals);
  return unitSymbol && isNumber(value) ? `${quantity} ${unitSymbol}` : quantity;
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (!isNumber(value)) return EMPTY;
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** 06/10/2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const date = value ? toDate(value) : null;
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** 06/10/2026 3:45 p. m. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = value ? toDate(value) : null;
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** "Ana Pérez" → "AP" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? "?"];
  return letters
    .map((part) => firstGrapheme(part ?? ""))
    .join("")
    .toUpperCase();
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** First user-perceived character; `charAt(0)` would split emoji in half. */
function firstGrapheme(text: string): string {
  return segmenter.segment(text)[Symbol.iterator]().next().value?.segment ?? "";
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
  if (!from) return EMPTY;
  const elapsed = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  if (Number.isNaN(elapsed)) return EMPTY;
  const minutes = Math.max(0, Math.round(elapsed));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0)
    return hours > 0
      ? `${days} ${days === 1 ? "día" : "días"} ${hours} h`
      : `${days} ${days === 1 ? "día" : "días"}`;
  if (hours > 0) return minutes % 60 > 0 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  return `${minutes} min`;
}
