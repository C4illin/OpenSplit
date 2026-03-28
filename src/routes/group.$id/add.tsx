import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { expenseFormDefaults, SplitEditor } from "@/components/SplitEditor";
import { Wrapper } from "@/components/Wrapper";
import { useCreateExpense, useGroup } from "@/hooks/useApi";
import { useAppForm, withForm } from "@/hooks/useAppForm";
import { pb } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

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
  const currentUserId = pb.authStore.record?.id ?? "";
  const [step, setStep] = useState<Step>("amount");

  const form = useAppForm({
    defaultValues: {
      ...expenseFormDefaults,
      paidBy: currentUserId,
      splits: members.map((m) => ({
        user: m.id,
        percentage: members.length > 0 ? 100 / members.length : 0,
      })),
    },
    onSubmit: async ({ value }) => {
      const splits = value.splits;

      await createExpense.mutateAsync({
        title: value.title,
        amount: parseFloat(value.amount),
        currency: value.currency,
        date: new Date().toISOString(),
        group: id,
        paidBy: value.paidBy,
        splits,
      });

      navigate({ to: "/group/$id", params: { id } });
    },
  });

  const stepIndex = STEPS.indexOf(step);
  const isLast = stepIndex === STEPS.length - 1;

  const goNext = () => {
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
    } else {
      navigate({ to: "/group/$id", params: { id } });
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
              i <= stepIndex ? "w-6 bg-primary" : "w-6 bg-muted"
            )}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isLast) {
            form.handleSubmit();
          } else {
            goNext();
          }
        }}
        className="flex flex-1 flex-col"
      >
        {/* Step content — centered vertically */}
        <div className="flex flex-1 flex-col items-center justify-center">
          {step === "amount" && <AmountStep form={form} />}
          {step === "title" && <TitleStep form={form} />}
          {step === "split" && (
            <SplitEditor
              form={form}
              members={members}
              currentUserId={currentUserId}
            />
          )}
        </div>

        {/* Bottom nav */}
        <div className="sticky bottom-0 flex gap-3 pt-4 pb-6">
          <Button
            variant="outline"
            type="button"
            onClick={goBack}
            size="lg"
            className="flex-1"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          {isLast ? (
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
                    {isSubmitting ? "Adding..." : "Add expense"}
                  </Button>
                );
              }}
            </form.Subscribe>
          ) : (
            <form.Subscribe
              selector={(state) => state.values}
            >
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
                  <Button
                    type="submit"
                    disabled={disabled}
                    size="lg"
                    className="flex-1"
                  >
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
  render: ({ form }) => (
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
                w-full [appearance:textfield] bg-transparent text-center
                text-5xl font-bold tracking-tight outline-none
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
  ),
});

const TitleStep = withForm({
  defaultValues: expenseFormDefaults,
  render: ({ form }) => (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">What was it for?</p>

      <form.Field
        name="title"
        validators={{
          onChange: ({ value }) =>
            value.length < 1 ? "Title is required" : undefined,
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
                w-full bg-transparent text-center text-3xl font-semibold
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
  ),
});

