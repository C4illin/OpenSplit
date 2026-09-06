import { CurrencyPicker } from "@/components/CurrencyPicker";
import { LinkArrow } from "@/components/LinkArrow";
import { SplitEditor } from "@/components/SplitEditor";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/Wrapper";
import {
  useConverter,
  useDeleteExpense,
  useGetExpense,
  useGroup,
  useUpdateExpense,
} from "@/hooks/useApi";
import { useAppForm } from "@/hooks/useAppForm";
import { expenseFormDefaults } from "@/lib/expense-form";
import { pb } from "@/lib/pocketbase";
import { requireAuth } from "@/lib/requireAuth";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/group/$id/expense/$expenseId")({
  beforeLoad: requireAuth,
  component: EditExpensePage,
});

function EditExpensePage() {
  const { id, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const { data: group } = useGroup(id);
  const { data: expense, isLoading } = useGetExpense(expenseId);
  const members = group?.expand?.members ?? [];
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const convertToBase = useConverter();
  const base = group?.currency || "sek";
  const currentUserId = pb.authStore.record?.id ?? "";
  const [convertError, setConvertError] = useState<string | null>(null);

  const existingSplits = expense?.expand?.splits_via_expense ?? [];
  const existingSplitIds = existingSplits.map((s) => s.id);

  const form = useAppForm({
    defaultValues: {
      ...expenseFormDefaults,
      title: expense?.title ?? "",
      amount: expense?.amount?.toString() ?? "",
      currency: expense?.currency || base,
      date: expense?.date ? expense.date.slice(0, 16) : "",
      paidBy: expense?.paidBy ?? currentUserId,
      category: expense?.category ?? "",
      splits: members.map((m) => {
        const existing = existingSplits.find((s) => s.user === m.id);
        return {
          user: m.id,
          percentage: existing?.percentage ?? 0,
        };
      }),
      excluded: members
        .filter((m) => {
          const existing = existingSplits.find((s) => s.user === m.id);
          return !existing || existing.percentage === 0;
        })
        .map((m) => m.id),
    },
    onSubmit: async ({ value }) => {
      const amount = parseFloat(value.amount);
      const date = new Date(value.date).toISOString();

      // Keep the originally locked rate unless the amount or currency changed;
      // otherwise re-convert at the rate effective on the expense's date.
      let baseAmount: number | null;
      if (
        expense &&
        value.currency === expense.currency &&
        amount === expense.amount &&
        expense.baseAmount != null
      ) {
        baseAmount = expense.baseAmount;
      } else {
        baseAmount = convertToBase(amount, value.currency, base, date);
      }
      if (baseAmount == null) {
        setConvertError("No exchange rate available for this currency on that date.");
        return;
      }
      setConvertError(null);

      await updateExpense.mutateAsync({
        id: expenseId,
        title: value.title,
        amount,
        currency: value.currency,
        baseAmount,
        date,
        group: id,
        paidBy: value.paidBy,
        splits: value.splits,
        existingSplitIds,
        category: value.category,
      });

      await navigate({ to: "/group/$id", params: { id } });
    },
  });

  if (isLoading || !expense) {
    return (
      <Wrapper className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper className="flex min-h-dvh flex-col px-4">
      <div className="flex items-center justify-between pt-6 pb-4">
        <div className="flex flex-row items-center justify-center gap-2">
          <LinkArrow link="/group/$id" />
          <h1 className="text-lg font-semibold">Edit expense</h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Delete this expense?")) return;
            await deleteExpense.mutateAsync({
              id: expenseId,
              group: id,
              splitIds: existingSplitIds,
            });
            await navigate({ to: "/group/$id", params: { id } });
          }}
          className="
            flex size-8 items-center justify-center rounded-md text-muted-foreground
            transition-colors
            hover:bg-destructive/10 hover:text-destructive
          "
          title="Delete expense"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {expense.recurring && (
        <p className="flex items-center gap-1.5 pb-4 text-sm text-muted-foreground">
          <Repeat size={14} className="shrink-0" />
          <span>
            Added automatically by a{" "}
            <Link
              to="/group/$id/recurring/$recurringId"
              params={{ id, recurringId: expense.recurring }}
              className="underline underline-offset-4"
            >
              recurring expense
            </Link>
            .
          </span>
        </p>
      )}

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
              onChange: ({ value }) => (value.length < 1 ? "Title is required" : undefined),
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-1">
                <input
                  placeholder="Dinner, groceries..."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="
                    w-full bg-transparent text-2xl font-semibold tracking-tight outline-none
                    placeholder:text-muted-foreground/40
                  "
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
                )}
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
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="currency">
            {(field) => (
              <CurrencyPicker
                value={field.state.value}
                onChange={field.handleChange}
                base={base}
                groupId={id}
              />
            )}
          </form.Field>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Date</p>
          <form.Field
            name="date"
            validators={{
              onChange: ({ value }) => (!value ? "Date is required" : undefined),
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-1">
                <input
                  type="datetime-local"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="
                    w-full bg-transparent text-base outline-none
                    placeholder:text-muted-foreground/40
                  "
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Category</p>
          <form.Field name="category">
            {(field) => (
              <CategoryPicker
                groupId={id}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </div>

        {/* Split editor */}
        <SplitEditor form={form} members={members} currentUserId={currentUserId} />

        {convertError && <p className="text-sm text-destructive">{convertError}</p>}

        {/* Bottom actions */}
        <div className="sticky bottom-0 flex gap-3 pt-4 pb-6">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate({ to: "/group/$id", params: { id } })}
            size="lg"
            className="flex-1"
          >
            <ArrowLeft size={16} />
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) =>
              [state.canSubmit, state.isSubmitting, state.values.splits] as const
            }
          >
            {([canSubmit, isSubmitting, splits]) => {
              const totalPct = splits.reduce((s, x) => s + x.percentage, 0);
              const invalidSplit = Math.abs(totalPct - 100) > 0.1;
              return (
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || invalidSplit}
                  size="lg"
                  className="flex-1"
                >
                  <Check size={16} />
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </form>
    </Wrapper>
  );
}
