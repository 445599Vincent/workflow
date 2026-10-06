import { TIME_ZONE } from "@/lib/format";

/**
 * CSV for Excel (D-031): UTF-8 with BOM so accents show correctly, comma
 * separator, dot decimals, CRLF line endings.
 */
export type CsvValue = string | number | boolean | null | undefined;

function field(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(field).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-10-06 07:39" in the business time zone (sortable in Excel). */
export function csvDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormatter.format(new Date(value)) : "";
}

export function csvResponse(content: string, fileName: string) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
