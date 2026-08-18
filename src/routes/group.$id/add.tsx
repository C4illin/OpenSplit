import { CurrencyPicker } from "@/components/CurrencyPicker";
import { SplitEditor } from "@/components/SplitEditor";
import { CategoryPicker } from "@/components/CategoryPicker";
import { expenseFormDefaults } from "@/lib/expense-form";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/Wrapper";
import { useConverter, useCreateExpense, useGroup } from "@/hooks/useApi";
import { useAppForm, withForm } from "@/hooks/useAppForm";
import { pb } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";

type Converter = ReturnType<typeof useConverter>;

type Step = "amount" | "title" | "split";
const STEPS: Step[] = ["amount", "title", "split"];

export const Route = createFileRoute("/group/$id/add")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: AddExpensePage,
});

function AddExpensePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: group } = useGroup(id);
  const members = group?.expand?.members ?? [];
  const createExpense = useCreateExpense();
  const convertToBase = useConverter();
  const base = group?.currency || "sek";
  const currentUserId = pb.authStore.record?.id ?? "";
  const [step, setStep] = useState<Step>("amount");
  const [convertError, setConvertError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      ...expenseFormDefaults,
      currency: base,
      paidBy: currentUserId,
      splits: members.map((m) => ({
        user: m.id,
        percentage: members.length > 0 ? 100 / members.length : 0,
      })),
    },
    onSubmit: async ({ value }) => {
      const splits = value.splits;
      const date = new Date().toISOString();
      const amount = parseFloat(value.amount);

      // Lock in the converted amount at today's rate so balances stay stable.
      const baseAmount = convertToBase(amount, value.currency, base, date);
      if (baseAmount == null) {
        setConvertError("No exchange rate available yet for this currency. Try again shortly.");
        return;
      }
      setConvertError(null);

      await createExpense.mutateAsync({
        title: value.title,
        amount,
        currency: value.currency,
        baseAmount,
        date,
        group: id,
        paidBy: value.paidBy,
        splits,
        category: value.category,
      });

      await navigate({ to: "/group/$id", params: { id } });
    },
  });

  const stepIndex = STEPS.indexOf(step);
  const isLast = stepIndex === STEPS.length - 1;

  const goNext = () => {
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  };

  const goBack = async () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
    } else {
      await navigate({ to: "/group/$id", params: { id } });
    }
  };

  return (
    <Wrapper className="flex min-h-dvh flex-col px-4">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 pt-6 pb-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 rounded-full transition-all duration-200",
              i <= stepIndex ? "w-6 bg-primary" : "w-6 bg-muted",
            )}
          />
        ))}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isLast) {
            await form.handleSubmit();
          } else {
            goNext();
          }
        }}
        className="flex flex-1 flex-col"
      >
        {/* Step content — centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center">
          {step === "amount" && (
            <AmountStep form={form} base={base} groupId={id} convertToBase={convertToBase} />
          )}
          {step === "title" && <TitleStep form={form} groupId={id} />}
          {step === "split" && (
            <SplitEditor form={form} members={members} currentUserId={currentUserId} />
          )}
        </div>

        {convertError && (
          <p className="pt-2 text-center text-sm text-destructive">{convertError}</p>
        )}

        {/* Bottom nav */}
        <div className="flex gap-3 pt-4 pb-6">
          <Button variant="outline" type="button" onClick={goBack} size="lg" className="flex-1">
            <ArrowLeft size={16} />
            Back
          </Button>
          {isLast ? (
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
                    {isSubmitting ? "Adding..." : "Add expense"}
                  </Button>
                );
              }}
            </form.Subscribe>
          ) : (
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                let disabled = true;
                if (step === "amount") {
                  const amt = parseFloat(values.amount);
                  disabled = values.amount === "" || isNaN(amt) || amt <= 0;
                } else if (step === "title") {
                  disabled = values.title.length === 0;
                } else {
                  disabled = false;
                }
                return (
                  <Button type="submit" disabled={disabled} size="lg" className="flex-1">
                    Next
                    <ArrowRight size={16} />
                  </Button>
                );
              }}
            </form.Subscribe>
          )}
        </div>
      </form>
    </Wrapper>
  );
}

const AmountStep = withForm({
  defaultValues: expenseFormDefaults,
  props: {
    base: "sek",
    groupId: "",
    convertToBase: (() => null) as Converter,
  },
  render: ({ form, base, groupId, convertToBase }) => (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">How much was it?</p>

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
          <div className="flex flex-col items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0"
              autoFocus
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="
                w-full [appearance:textfield] bg-transparent text-center text-5xl font-bold
                tracking-tight outline-none
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
            groupId={groupId}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(s) => [s.values.amount, s.values.currency] as const}>
        {([amount, currency]) => {
          const parsed = parseFloat(amount);
          if (isNaN(parsed) || parsed <= 0) return null;
          // Preview is always in the group's base currency, since that's what
          // gets stored and drives balances.
          if (currency === base) {
            return <p className="text-sm text-muted-foreground">{formatAmount(parsed, base)}</p>;
          }
          const converted = convertToBase(parsed, currency, base);
          return (
            <p className="text-sm text-muted-foreground">
              {formatAmount(parsed, currency)}
              {converted != null
                ? ` ≈ ${formatAmount(converted, base)}`
                : " · no rate available yet"}
            </p>
          );
        }}
      </form.Subscribe>
    </div>
  ),
});

const TitleStep = withForm({
  defaultValues: expenseFormDefaults,
  props: {
    groupId: "",
  },
  render: ({ form, groupId }) => (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">What was it for?</p>

      <form.Field
        name="title"
        validators={{
          onChange: ({ value }) => (value.length < 1 ? "Title is required" : undefined),
        }}
      >
        {(field) => (
          <div className="flex w-full flex-col items-center gap-1">
            <input
              placeholder="Dinner, groceries..."
              autoFocus
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="
                w-full bg-transparent text-center text-3xl font-semibold tracking-tight outline-none
                placeholder:text-muted-foreground/40
              "
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="category">
        {(field) => (
          <div className="flex justify-center">
            <CategoryPicker
              groupId={groupId}
              value={field.state.value}
              onChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>
    </div>
  ),
});
