import { useCurrencies, useExpenses } from "@/hooks/useApi";

type CurrencyPickerProps = {
  value: string;
  onChange: (id: string) => void;
  /** Group base currency, floated to the top of the list. */
  base?: string;
  /** When set, currencies recently used in this group are floated to the top. */
  groupId?: string;
};

export function CurrencyPicker({ value, onChange, base, groupId }: CurrencyPickerProps) {
  const { data: currencies } = useCurrencies();
  // Shares the ["expenses", groupId] cache with the group screens; disabled when
  // no groupId (e.g. when creating a group). Deriving recents is O(n) over rows
  // that are already loaded, so it's cheap.
  const { data: expenses } = useExpenses(groupId ?? "");
  const known = currencies ?? [];

  // Currencies used in this group, most-recent first (expenses come sorted by
  // -date), deduped.
  const recent: string[] = [];
  for (const e of expenses ?? []) {
    if (e.currency && !recent.includes(e.currency)) recent.push(e.currency);
  }

  const knownIds = new Set(known.map((c) => c.id));
  const topIds = Array.from(new Set([base, ...recent].filter(Boolean) as string[])).filter((id) =>
    knownIds.has(id),
  );
  const topSet = new Set(topIds);
  const rest = known.filter((c) => !topSet.has(c.id));

  const optionLabel = (id: string) => {
    const c = known.find((x) => x.id === id);
    return c ? `${c.id.toUpperCase()} — ${c.name}` : id.toUpperCase();
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        rounded-md border bg-transparent px-3 py-2 text-sm outline-none
        focus:ring-2 focus:ring-ring
      "
      aria-label="Currency"
    >
      {/* Keep the current value selectable even before the list has loaded. */}
      {value && !knownIds.has(value) && <option value={value}>{value.toUpperCase()}</option>}
      {topIds.map((id) => (
        <option key={id} value={id}>
          {optionLabel(id)}
        </option>
      ))}
      {rest.length > 0 && (
        <optgroup label="All currencies">
          {rest.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id.toUpperCase()} — {c.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
