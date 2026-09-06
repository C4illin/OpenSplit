import { RecurringExpensesFrequencyOptions as Frequency } from "@/types/pocketbase-types.gen";

// Client-side helpers for recurring expenses. The schedule itself is advanced
// on the server (pb_hooks/recurring.js); the client only creates and edits
// templates, so the only shared convention is how a schedule day is stored:
// as midnight UTC of a bare calendar day, so the server can step it without
// any timezone math.

export type RecurringSplit = { user: string; percentage: number };

export const FREQUENCIES: { value: Frequency; label: string; unit: string }[] = [
  { value: Frequency.weekly, label: "Weekly", unit: "week" },
  { value: Frequency.monthly, label: "Monthly", unit: "month" },
  { value: Frequency.yearly, label: "Yearly", unit: "year" },
];

/** "Monthly", "Every 2 weeks", ... An unset interval (0) counts as 1. */
export function describeSchedule(frequency: string, interval: number): string {
  const f = FREQUENCIES.find((x) => x.value === frequency);
  if (!f) return frequency;
  return interval > 1 ? `Every ${interval} ${f.unit}s` : f.label;
}

/** The `yyyy-mm-dd` day of a stored schedule date, for `<input type="date">`. */
export function toDayInput(storedDate: string): string {
  return storedDate.slice(0, 10);
}

/** A `yyyy-mm-dd` day as the midnight-UTC instant the server expects. */
export function fromDayInput(day: string): string {
  return `${day}T00:00:00.000Z`;
}

/** Today's calendar day in the user's timezone as `yyyy-mm-dd`. */
export function todayInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
