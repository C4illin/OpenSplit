import { CategoryPicker } from "@/components/CategoryPicker";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { SplitEditor, type Member } from "@/components/SplitEditor";
import { Button } from "@/components/ui/button";
import type { RecurringExpense } from "@/hooks/useApi";
import { useAppForm } from "@/hooks/useAppForm";
import { expenseFormDefaults } from "@/lib/expense-form";
import { pb } from "@/lib/pocketbase";
import {
  FREQUENCIES,
  fromDayInput,
  toDayInput,
  todayInput,
  type RecurringSplit,
} from "@/lib/recurring";
import { RecurringExpensesFrequencyOptions as Frequency } from "@/types/pocketbase-types.gen";
import { ArrowLeft, Check } from "lucide-react";
import { useState, type ReactNode } from "react";

export type RecurringExpenseValues = {
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category: string;
  splits: RecurringSplit[];
  frequency: Frequency;
  /** Repeat every N units of `frequency`. */
  interval: number;
  /** Midnight UTC of the next due day. */
  nextDate: string;
  /** Midnight UTC of the last day to repeat on, or "" for no end. */
  endDate: string;
};

type Props = {
  groupId: string;
  members: Member[];
  /** Group base currency. */
  base: string;
  /** Existing template to edit; omit to create a new one. */
  initial?: RecurringExpense;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: RecurringExpenseValues) => Promise<void>;
  onCancel: () => void;
  /** Rendered between the fields and the bottom actions, e.g. an error message. */
  children?: ReactNode;
};

// Schedule fields live outside the TanStack form: `SplitEditor` is bound to the
// exact expense form shape, so the form keeps that shape and the schedule is
// plain component state (as `yyyy-mm-dd` strings straight from the inputs).
type Schedule = { frequency: Frequency; interval: string; nextDate: string; endDate: string };

const fieldErrors = (errors: unknown[]) =>
  errors.length > 0 ? <p className="text-sm text-destructive">{errors.join(", ")}</p> : null;

const dateInputClass = "w-full bg-transparent text-base outline-none";

/**
 * Shared create/edit form for a recurring expense template: the usual expense
 * fields (title, amount, currency, category, payer, split) plus the schedule.
 */
export function RecurringExpenseForm({
  groupId,
  members,
  base,
  initial,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
  children,
}: Props) {
  const currentUserId = pb.authStore.record?.id ?? "";
  const existingSplits = initial?.expand?.recurring_splits_via_recurring ?? [];
  const today = todayInput();

  const [schedule, setSchedule] = useState<Schedule>(() => ({
    frequency: initial?.frequency ?? Frequency.monthly,
    interval: initial ? String(initial.interval || 1) : "1",
    nextDate: initial ? toDayInput(initial.nextDate) : today,
    endDate: initial?.endDate ? toDayInput(initial.endDate) : "",
  }));
  const endBeforeNext = schedule.endDate !== "" && schedule.endDate < schedule.nextDate;
  const interval = Number(schedule.interval);
  const intervalInvalid = !Number.isInteger(interval) || interval < 1;
  const scheduleInvalid = !schedule.nextDate || endBeforeNext || intervalInvalid;

  const form = useAppForm({
    defaultValues: {
      ...expenseFormDefaults,
      title: initial?.title ?? "",
      amount: initial ? String(initial.amount) : "",
      currency: initial?.currency || base,
      paidBy: initial?.paidBy || currentUserId,
      category: initial?.category ?? "",
      splits: members.map((m) => {
        if (!initial) {
          return { user: m.id, percentage: members.length > 0 ? 100 / members.length : 0 };
        }
        const existing = existingSplits.find((s) => s.user === m.id);
        return { user: m.id, percentage: existing?.percentage ?? 0 };
      }),
      excluded: initial
        ? members
            .filter((m) => !existingSplits.some((s) => s.user === m.id && s.percentage > 0))
            .map((m) => m.id)
        : [],
    },
    onSubmit: async ({ value }) => {
      if (scheduleInvalid) return;
      await onSubmit({
        title: value.title.trim(),
        amount: parseFloat(value.amount),
        currency: value.currency,
        paidBy: value.paidBy,
        category: value.category,
        splits: value.splits.filter((s) => s.percentage > 0),
        frequency: schedule.frequency,
        interval,
        nextDate: fromDayInput(schedule.nextDate),
        endDate: schedule.endDate ? fromDayInput(schedule.endDate) : "",
      });
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      className="flex flex-1 flex-col gap-6"
    >
      {/* Title */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Title</p>
        <form.Field
          name="title"
          validators={{
            onChange: ({ value }) => (value.trim().length < 1 ? "Title is required" : undefined),
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <input
                placeholder="Rent, streaming, gym..."
                autoFocus={!initial}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="
                  w-full bg-transparent text-2xl font-semibold tracking-tight outline-none
                  placeholder:text-muted-foreground/40
                "
              />
              {fieldErrors(field.state.meta.errors)}
            </div>
          )}
        </form.Field>
      </div>

      {/* Amount + Currency */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Amount</p>
        <form.Field
          name="amount"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Amount is required";
              if (isNaN(parseFloat(value)) || parseFloat(value) <= 0)
                return "Must be a positive number";
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className="
                  w-full [appearance:textfield] bg-transparent text-3xl font-bold tracking-tight
                  outline-none
                  placeholder:text-muted-foreground/40
                  [&::-webkit-inner-spin-button]:appearance-none
                  [&::-webkit-outer-spin-button]:appearance-none
                "
              />
              {fieldErrors(field.state.meta.errors)}
            </div>
          )}
        </form.Field>

        <form.Field name="currency">
          {(field) => (
            <CurrencyPicker
              value={field.state.value}
              onChange={field.handleChange}
              base={base}
              groupId={groupId}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.values.currency}>
          {(currency) =>
            currency !== base ? (
              <p className="text-xs text-muted-foreground">
                Converted to {base.toUpperCase()} at the exchange rate on each due date.
              </p>
            ) : null
          }
        </form.Subscribe>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Category</p>
        <form.Field name="category">
          {(field) => (
            <CategoryPicker
              groupId={groupId}
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>
      </div>

      {/* Schedule */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Repeats</p>
        <div className="flex items-center gap-2">
          <span className="text-sm">Every</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={schedule.interval}
            onChange={(e) => setSchedule((s) => ({ ...s, interval: e.target.value }))}
            className="
              w-16 rounded-md border bg-transparent px-3 py-2 text-center text-sm outline-none
              focus:ring-2 focus:ring-ring
            "
            aria-label="Interval"
          />
          <select
            value={schedule.frequency}
            onChange={(e) => setSchedule((s) => ({ ...s, frequency: e.target.value as Frequency }))}
            className="
              rounded-md border bg-transparent px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-ring
            "
            aria-label="Frequency"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {interval === 1 ? f.unit : `${f.unit}s`}
              </option>
            ))}
          </select>
        </div>
        {intervalInvalid && (
          <p className="text-sm text-destructive">Must be a whole number, 1 or more</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{initial ? "Next due" : "First due"}</p>
        <div className="flex flex-col gap-1">
          <input
            type="date"
            value={schedule.nextDate}
            onChange={(e) => setSchedule((s) => ({ ...s, nextDate: e.target.value }))}
            className={dateInputClass}
            aria-label="Next due date"
          />
          {!schedule.nextDate ? (
            <p className="text-sm text-destructive">Date is required</p>
          ) : schedule.nextDate < today ? (
            <p className="text-xs text-muted-foreground">
              This date has passed, so every occurrence up to today will be added within the hour.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The expense is added automatically on each due date.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Ends (optional)</p>
        <div className="flex flex-col gap-1">
          <input
            type="date"
            value={schedule.endDate}
            onChange={(e) => setSchedule((s) => ({ ...s, endDate: e.target.value }))}
            className={dateInputClass}
            aria-label="End date"
          />
          {endBeforeNext ? (
            <p className="text-sm text-destructive">Must be on or after the next due date</p>
          ) : (
            !schedule.endDate && (
              <p className="text-xs text-muted-foreground">Repeats until you pause or delete it.</p>
            )
          )}
        </div>
      </div>

      {/* Paid by + split */}
      <SplitEditor form={form} members={members} currentUserId={currentUserId} />

      {children}

      {/* Bottom actions */}
      <div className="sticky bottom-0 flex gap-3 pt-4 pb-6">
        <Button variant="outline" type="button" onClick={onCancel} size="lg" className="flex-1">
          <ArrowLeft size={16} />
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting, state.values] as const}
        >
          {([canSubmit, isSubmitting, values]) => {
            const amount = parseFloat(values.amount);
            const totalPct = values.splits.reduce((s, x) => s + x.percentage, 0);
            const invalid =
              values.title.trim().length === 0 ||
              isNaN(amount) ||
              amount <= 0 ||
              scheduleInvalid ||
              Math.abs(totalPct - 100) > 0.1;
            return (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting || invalid}
                size="lg"
                className="flex-1"
              >
                <Check size={16} />
                {isSubmitting ? pendingLabel : submitLabel}
              </Button>
            );
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}
