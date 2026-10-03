import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { withForm } from "@/hooks/useAppForm";
import { expenseFormDefaults } from "@/lib/expense-form";
import { formatAmount } from "@/lib/format";
import { getAvatarUrl } from "@/lib/pocketbase";
import type { UsersResponse } from "@/types/pocketbase-types.gen";
import { cn } from "cn";
import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";

function computeInitialLocked(
  splits: { user: string; percentage: number }[] | undefined,
  excluded: string[] | undefined,
  members: UsersResponse[],
): Set<number> {
  const excludedSet = new Set(excluded || []);
  const included = members.map((_, i) => i).filter((i) => !excludedSet.has(members[i].id));

  if (included.length < 2 || !splits || splits.length === 0) return new Set();

  const pcts = included.map((i) => splits[i]?.percentage ?? 0);
  const minPct = Math.min(...pcts);
  const maxPct = Math.max(...pcts);

  // If all included members have essentially the same percentage (equal split),
  // none are locked.
  if (maxPct - minPct < 0.05) {
    return new Set();
  }

  // Check if multiple members share the exact same percentage (unlocked remainder).
  // E.g. Alice: 50%, Bob: 25%, Charlie: 25% -> Bob & Charlie shared the remainder.
  const counts = new Map<number, number[]>();
  for (const i of included) {
    const rounded = Math.round((splits[i]?.percentage ?? 0) * 100) / 100;
    const list = counts.get(rounded) || [];
    list.push(i);
    counts.set(rounded, list);
  }

  for (const list of counts.values()) {
    if (list.length >= 2 && list.length < included.length) {
      const lockedSet = new Set<number>();
      const unlockedSet = new Set(list);
      for (const i of included) {
        if (!unlockedSet.has(i)) lockedSet.add(i);
      }
      return lockedSet;
    }
  }

  // All included members have distinct percentages: the last included member
  // was the sole remainder; all earlier included members were locked.
  const lockedSet = new Set<number>();
  for (let idx = 0; idx < included.length - 1; idx++) {
    lockedSet.add(included[idx]);
  }
  return lockedSet;
}

export const SplitEditor = withForm({
  defaultValues: expenseFormDefaults,
  props: {
    members: [] as UsersResponse[],
    currentUserId: "",
  },
  render: function SplitEditorRender({ form, members }) {
    const totalAmount = parseFloat(form.state.values.amount) || 0;
    const [locked, setLocked] = useState<Set<number>>(() =>
      computeInitialLocked(form.state.values.splits, form.state.values.excluded, members),
    );
    const [displayMode, setDisplayMode] = useState<"percentage" | "value">("percentage");
    const [editing, setEditing] = useState<{ index: number; raw: string } | null>(null);

    const redistributeAmong = (excludedIds: string[], lockedSet: Set<number>) => {
      const lockedTotal = form.state.values.splits.reduce(
        (sum, s, i) =>
          lockedSet.has(i) && !excludedIds.includes(members[i].id) ? sum + s.percentage : sum,
        0,
      );
      const unlocked = members
        .map((_, i) => i)
        .filter((i) => !excludedIds.includes(members[i].id) && !lockedSet.has(i));
      const remainder = Math.max(0, 100 - lockedTotal);
      const perUnlocked = unlocked.length > 0 ? remainder / unlocked.length : 0;

      for (let i = 0; i < members.length; i++) {
        if (excludedIds.includes(members[i].id)) {
          form.setFieldValue(`splits[${i}].percentage`, 0);
        } else if (!lockedSet.has(i)) {
          form.setFieldValue(`splits[${i}].percentage`, perUnlocked);
        }
      }
    };

    const toggleMember = (memberId: string) => {
      const current = form.state.values.excluded;

      const next = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId];
      form.setFieldValue("excluded", next);

      const memberIndex = members.findIndex((m) => m.id === memberId);
      const newLocked = new Set(locked);
      newLocked.delete(memberIndex);
      setLocked(newLocked);

      redistributeAmong(next, newLocked);
    };

    const formatValue = (pct: number) => {
      if (displayMode === "value") {
        return new Intl.NumberFormat(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: false,
        }).format((totalAmount * pct) / 100);
      }
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
        useGrouping: false,
      }).format(Math.round(pct * 100) / 100);
    };

    const parseLocaleNumber = (raw: string) => parseFloat(raw.replace(",", ".")) || 0;

    const handleSplitChange = (index: number, rawValue: number) => {
      const newPct =
        displayMode === "value" && totalAmount > 0 ? (rawValue / totalAmount) * 100 : rawValue;
      const value = Math.max(0, newPct);
      form.setFieldValue(`splits[${index}].percentage`, value);

      const newLocked = new Set(locked).add(index);
      setLocked(newLocked);

      const excluded = form.state.values.excluded;
      const lockedTotal = form.state.values.splits.reduce((sum, s, i) => {
        if (excluded.includes(members[i].id)) return sum;
        if (i === index) return sum + value;
        if (newLocked.has(i)) return sum + s.percentage;
        return sum;
      }, 0);

      const unlocked = members
        .map((_, i) => i)
        .filter((i) => !excluded.includes(members[i].id) && !newLocked.has(i));
      const remainder = Math.max(0, 100 - lockedTotal);
      const perUnlocked = unlocked.length > 0 ? remainder / unlocked.length : 0;

      for (const i of unlocked) {
        form.setFieldValue(`splits[${i}].percentage`, perUnlocked);
      }
    };

    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Paid by</p>
          <form.Field name="paidBy">
            {(field) => (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => field.handleChange(m.id)}
                    className={cn(
                      `
                        flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm
                        transition-colors
                      `,
                      field.state.value === m.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : `
                          border-border text-muted-foreground
                          hover:bg-muted
                        `,
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={getAvatarUrl(m, m.avatar)} alt={m.name || m.username} />
                      <AvatarFallback>
                        {(m.name || m.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {m.name || m.username}
                  </button>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Split between</p>
            <button
              type="button"
              onClick={() => setDisplayMode((m) => (m === "percentage" ? "value" : "percentage"))}
              className="
                flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground
                transition-colors
                hover:bg-muted
              "
            >
              {displayMode === "percentage"
                ? `Show ${form.state.values.currency.toUpperCase()}`
                : `Show %`}
            </button>
          </div>
          <form.Subscribe selector={(s) => [s.values.excluded, s.values.splits] as const}>
            {([excluded, splits]) => {
              const totalPct = splits.reduce((s, x) => s + x.percentage, 0);

              return (
                <div className="flex flex-col gap-2">
                  {members.map((member, i) => {
                    const isIncluded = !excluded.includes(member.id);
                    const pct = splits[i]?.percentage ?? 0;
                    const isLocked = locked.has(i);
                    const unlocked = members
                      .map((_, j) => j)
                      .filter((j) => !excluded.includes(members[j].id) && !locked.has(j));
                    const isSoleRemainder = isIncluded && !isLocked && unlocked.length === 1;

                    return (
                      <div
                        key={member.id}
                        className={cn(
                          `flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors`,
                          !isIncluded
                            ? "border-border opacity-50"
                            : isLocked
                              ? "border-foreground/20 bg-foreground/5"
                              : "border-primary/30 bg-primary/5",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMember(member.id)}
                          className={cn(
                            `
                              flex size-5 shrink-0 items-center justify-center rounded-sm border
                              transition-colors
                            `,
                            isIncluded
                              ? `border-primary bg-primary text-primary-foreground`
                              : "border-muted-foreground/30",
                          )}
                        >
                          {isIncluded && <Check size={14} />}
                        </button>
                        <Avatar size="sm" className="shrink-0">
                          <AvatarImage
                            src={getAvatarUrl(member, member.avatar)}
                            alt={member.name || member.email}
                          />
                          <AvatarFallback>
                            {(member.name || member.email || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm",
                            !isIncluded && "text-muted-foreground",
                          )}
                        >
                          {member.name || member.email?.split("@")[0] || "User"}
                        </span>

                        {isIncluded ? (
                          isSoleRemainder ? (
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(locked);
                                next.add(i);
                                setLocked(next);
                                setEditing({ index: i, raw: formatValue(pct) });
                              }}
                              className="
                                flex h-10 w-24 shrink-0 cursor-text items-center justify-end px-1
                                text-lg text-muted-foreground tabular-nums transition-colors
                                hover:text-foreground
                              "
                              title="Calculated automatically. Click to edit."
                            >
                              {formatValue(pct)}
                            </button>
                          ) : (
                            <Input
                              className={cn(
                                `
                                  h-10 w-24 shrink-0 [appearance:textfield] border-0 bg-transparent
                                  px-1 text-right text-lg tabular-nums shadow-none
                                  focus-visible:ring-0
                                  md:text-lg
                                  dark:bg-transparent
                                  [&::-webkit-inner-spin-button]:appearance-none
                                  [&::-webkit-outer-spin-button]:appearance-none
                                `,
                                isLocked ? "font-medium text-foreground" : "text-muted-foreground",
                              )}
                              type="text"
                              inputMode="decimal"
                              value={editing?.index === i ? editing.raw : formatValue(pct)}
                              onFocus={() => setEditing({ index: i, raw: formatValue(pct) })}
                              onChange={(e) => {
                                setEditing({ index: i, raw: e.target.value });
                                handleSplitChange(i, parseLocaleNumber(e.target.value));
                              }}
                              onBlur={() => setEditing(null)}
                            />
                          )
                        ) : (
                          <span
                            className="
                              flex h-10 w-24 shrink-0 items-center justify-end px-1 text-lg
                              text-muted-foreground tabular-nums
                            "
                          >
                            {formatValue(0)}
                          </span>
                        )}

                        <span className="w-4 shrink-0 text-xs text-muted-foreground">
                          {displayMode === "percentage" ? "%" : ""}
                        </span>

                        {isIncluded && isLocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(locked);
                              next.delete(i);
                              setLocked(next);
                              redistributeAmong(excluded, next);
                            }}
                            className="
                              ml-1 flex size-5 shrink-0 items-center justify-center rounded-sm
                              text-muted-foreground transition-colors
                              hover:bg-muted hover:text-foreground
                            "
                            title="Reset to equal share"
                          >
                            <RotateCcw size={12} />
                          </button>
                        ) : (
                          <span className="ml-1 w-5 shrink-0" />
                        )}
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div
                    className="
                      flex justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground
                    "
                  >
                    <span>Total</span>
                    <span className={cn(Math.abs(totalPct - 100) > 0.1 && `text-destructive`)}>
                      {displayMode === "percentage"
                        ? `${new Intl.NumberFormat(undefined, {
                            maximumFractionDigits: 2,
                            useGrouping: false,
                          }).format(Math.round(totalPct * 100) / 100)}%`
                        : formatAmount(totalAmount, form.state.values.currency)}
                    </span>
                  </div>
                </div>
              );
            }}
          </form.Subscribe>
        </div>
      </div>
    );
  },
});
