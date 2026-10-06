import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { Json } from "@/types/database";
import { AUDIT_ENTITIES, IGNORED_FIELDS, auditActionLabel } from "../labels";
import type { AuditRow } from "../queries";

type Data = Record<string, Json | undefined>;

function asObject(value: Json | null): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : null;
}

/** A human handle for the affected record (number, SKU, name…). */
function identify(row: AuditRow) {
  const data = asObject(row.new_data) ?? asObject(row.old_data);
  if (!data) return null;
  for (const key of ["number", "sku", "full_name", "name", "title", "email", "key", "code"]) {
    const value = data[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function show(value: Json | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

export function AuditList({ rows }: { rows: AuditRow[] }) {
  return (
    <ul className="divide-y" data-testid="audit-list">
      {rows.map((row) => {
        const before = asObject(row.old_data);
        const after = asObject(row.new_data);
        const changes = (row.changed_fields ?? []).filter((field) => !IGNORED_FIELDS.has(field));
        const handle = identify(row);
        return (
          <li key={row.id} className="space-y-1 px-4 py-3 text-sm sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{row.actor?.full_name ?? "Sistema"}</span>
              <span>{auditActionLabel(row.action).toLowerCase()}</span>
              <Badge variant="secondary">
                {AUDIT_ENTITIES[row.entity_table] ?? row.entity_table}
              </Badge>
              {handle && <span className="font-medium">{handle}</span>}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(row.occurred_at)}
              </span>
            </div>
            {row.summary && <p className="text-muted-foreground">{row.summary}</p>}
            {row.action === "update" && changes.length > 0 && (
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {changes.map((field) => (
                  <li key={field}>
                    <span className="font-mono">{field}</span>: {show(before?.[field])} →{" "}
                    <span className="text-foreground">{show(after?.[field])}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
