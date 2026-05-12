import { LinkArrow } from "@/components/LinkArrow";
import { expenseFormDefaults, SplitEditor } from "@/components/SplitEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/Wrapper";
import { useDeleteExpense, useGetExpense, useGroup, useUpdateExpense } from "@/hooks/useApi";
import { useAppForm } from "@/hooks/useAppForm";
import { pb } from "@/lib/pocketbase";
import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, Check, Trash2 } from "lucide-react";

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

export const Route = createFileRoute("/group/$id/expense/$expenseId")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
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
  const currentUserId = pb.authStore.record?.id ?? "";

  const existingSplits = expense?.expand?.["splits(expense)"] ?? [];
  const existingSplitIds = existingSplits.map((s) => s.id);

  const form = useAppForm({
    defaultValues: {
      ...expenseFormDefaults,
      title: expense?.title ?? "",
      amount: expense?.amount?.toString() ?? "",
      currency: expense?.currency ?? "SEK",
      date: expense?.date ? expense.date.slice(0, 16) : "",
      paidBy: expense?.paidBy ?? currentUserId,
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
      await updateExpense.mutateAsync({
        id: expenseId,
        title: value.title,
        amount: parseFloat(value.amount),
        currency: value.currency,
        date: new Date(value.date).toISOString(),
        group: id,
        paidBy: value.paidBy,
        splits: value.splits,
        existingSplitIds,
      });

      navigate({ to: "/group/$id", params: { id } });
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
        <div className="flex flex-row justify-center items-center gap-2">
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
            navigate({ to: "/group/$id", params: { id } });
          }}
          className="
            flex h-8 w-8 items-center justify-center rounded-md
            text-muted-foreground transition-colors
            hover:bg-destructive/10 hover:text-destructive
          "
          title="Delete expense"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-1 flex-col gap-6"
      >
        {/* Title */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Title</p>
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.length < 1 ? "Title is required" : undefined,
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
                    w-full bg-transparent text-2xl font-semibold
                    tracking-tight outline-none
                    placeholder:text-muted-foreground/40
                  "
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
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
                    w-full [appearance:textfield] bg-transparent text-3xl
                    font-bold tracking-tight outline-none
                    placeholder:text-muted-foreground/40
                    [&::-webkit-inner-spin-button]:appearance-none
                    [&::-webkit-outer-spin-button]:appearance-none
                  "
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="currency">
            {(field) => (
              <div className="flex gap-1.5">
                {CURRENCIES.map((c) => (
                  <Badge
                    key={c}
                    variant={field.state.value === c ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1"
                    onClick={() => field.handleChange(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Date</p>
          <form.Field
            name="date"
            validators={{
              onChange: ({ value }) =>
                !value ? "Date is required" : undefined,
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
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Split editor */}
        <SplitEditor
          form={form}
          members={members}
          currentUserId={currentUserId}
        />

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
            selector={(state) => [state.canSubmit, state.isSubmitting, state.values.splits] as const}
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
