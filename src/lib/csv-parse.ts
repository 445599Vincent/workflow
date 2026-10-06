/**
 * Minimal CSV reader for files saved from Excel (IMP-02): UTF-8 with or
 * without BOM, comma or semicolon separator (detected from the header line),
 * quoted fields with "" escapes and line breaks, CRLF or LF.
 */
export type ParsedCsv = {
  delimiter: "," | ";";
  headers: string[];
  rows: string[][];
};

function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((row) => row.some((cell) => cell.trim() !== ""));
  const [headers = [], ...rows] = nonEmpty;
  return { delimiter, headers: headers.map((header) => header.trim()), rows };
}
