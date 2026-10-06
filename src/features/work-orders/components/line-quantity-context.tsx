import { formatQuantityWithUnit } from "@/lib/format";

/** Small facts shown in execution dialogs so the user decides with real numbers. */
export function QuantityFacts({
  facts,
  unitSymbol,
  decimals,
}: {
  facts: [string, number][];
  unitSymbol: string;
  decimals: number;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-3">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-semibold tabular-nums">
            {formatQuantityWithUnit(value, unitSymbol, decimals)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
