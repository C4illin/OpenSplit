import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrapper } from "@/components/Wrapper";
import { useCreateExpense, useGroup } from "@/hooks/useApi";
import { useAppForm, withForm } from "@/hooks/useAppForm";
import { getAvatarUrl, pb } from "@/lib/pocketbase";
import { cn } from "@/lib/utils";
import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Percent } from "lucide-react";
import { useState } from "react";

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

type Step = "amount" | "title" | "split";
const STEPS: Step[] = ["amount", "title", "split"];

const formDefaults = {
  title: "",
  amount: "",
  currency: "SEK",
  paidBy: "",
  splitType: "equal" as "equal" | "custom",
  splits: [] as { user: string; percentage: number }[],
};

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
      ...formDefaults,
      paidBy: currentUserId,
      splits: members.map((m) => ({
        user: m.id,
        percentage: members.length > 0 ? 100 / members.length : 0,
      })),
    },
    onSubmit: async ({ value }) => {
      const splits =
        value.splitType === "equal"
          ? members.map((m) => ({
            user: m.id,
            percentage: 100 / members.length,
          }))
          : value.splits;

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
            <SplitStep
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
              selector={(state) => [state.canSubmit, state.isSubmitting, state.values.splits, state.values.splitType] as const}
            >
              {([canSubmit, isSubmitting, splits, splitType]) => {
                const totalPct = splits.reduce((s, x) => s + x.percentage, 0);
                const invalidSplit = splitType === "custom" && Math.abs(totalPct - 100) > 0.1;
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
  defaultValues: formDefaults,
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
  defaultValues: formDefaults,
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

const SplitStep = withForm({
  defaultValues: formDefaults,
  props: {
    members: [] as { id: string; collectionId: string; collectionName: string; name: string; username: string; avatar: string }[],
    currentUserId: "",
  },
  render: function SplitStepRender({ form, members }) {
    const [displayMode, setDisplayMode] = useState<"percentage" | "value">("percentage");
    const [locked, setLocked] = useState<Set<number>>(() => new Set());
    const totalAmount = parseFloat(form.state.values.amount) || 0;

    const getUnlocked = (lockedSet: Set<number>) =>
      members.map((_, i) => i).filter((i) => !lockedSet.has(i));

    const redistributeUnlocked = (lockedSet: Set<number>) => {
      const splits = form.state.values.splits;
      const lockedTotal = splits.reduce(
        (sum, s, i) => (lockedSet.has(i) ? sum + s.percentage : sum),
        0,
      );
      const unlocked = getUnlocked(lockedSet);
      const remainder = Math.max(0, 100 - lockedTotal);
      const perUnlocked = unlocked.length > 0 ? remainder / unlocked.length : 0;

      for (const i of unlocked) {
        form.setFieldValue(
          `splits[${i}].percentage`,
          Math.round(perUnlocked * 100) / 100,
        );
      }
    };

    const handleSplitChange = (index: number, rawValue: number) => {
      const newPct =
        displayMode === "value" && totalAmount > 0
          ? (rawValue / totalAmount) * 100
          : rawValue;
      const value = Math.max(0, newPct);

      form.setFieldValue(`splits[${index}].percentage`, value);

      const newLocked = new Set(locked).add(index);
      setLocked(newLocked);

      // Redistribute remainder among unlocked members
      const splits = form.state.values.splits;
      const lockedTotal = splits.reduce((sum, s, i) => {
        if (i === index) return sum + value;
        if (newLocked.has(i)) return sum + s.percentage;
        return sum;
      }, 0);

      const unlocked = getUnlocked(newLocked);
      const remainder = Math.max(0, 100 - lockedTotal);
      const perUnlocked = unlocked.length > 0 ? remainder / unlocked.length : 0;

      for (const i of unlocked) {
        form.setFieldValue(
          `splits[${i}].percentage`,
          Math.round(perUnlocked * 100) / 100,
        );
      }
    };

    const toggleLock = (index: number) => {
      setLocked((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        redistributeUnlocked(next);
        return next;
      });
    };

    const formatValue = (pct: number) => {
      if (displayMode === "value") {
        return (totalAmount * pct / 100).toFixed(2);
      }
      return `${Math.round(pct * 10) / 10}`;
    };

    return (
      <div className="flex w-full flex-col gap-6">
        {/* Paid by */}
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
                        flex items-center gap-2 rounded-full border px-3 py-1.5
                        text-sm transition-colors
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
                      <AvatarFallback>{(m.name || m.username).charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {m.name || m.username}
                  </button>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        {/* Split type */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Split</p>
          <form.Field name="splitType">
            {(field) => (
              <div className="flex gap-2">
                {[
                  { value: "equal" as const, label: "Equal" },
                  { value: "custom" as const, label: "Custom" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      field.handleChange(opt.value);
                      if (opt.value === "equal") {
                        setLocked(new Set());
                        const pct = members.length > 0 ? 100 / members.length : 0;
                        for (let i = 0; i < members.length; i++) {
                          form.setFieldValue(`splits[${i}].percentage`, pct);
                        }
                      }
                    }}
                    className={cn(
                      `
                        flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium
                        transition-colors
                      `,
                      field.state.value === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : `
                          border-border text-muted-foreground
                          hover:bg-muted
                        `,
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        {/* Custom split editor */}
        <form.Subscribe selector={(s) => [s.values.splitType, s.values.splits] as const}>
          {([splitType, splits]) => {
            if (splitType !== "custom") return null;

            return (
              <div className="flex flex-col gap-2">
                {/* Display mode toggle */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDisplayMode((m) => (m === "percentage" ? "value" : "percentage"))}
                    className="
                      flex items-center gap-1 rounded-md px-2 py-1 text-xs
                      text-muted-foreground transition-colors
                      hover:bg-muted
                    "
                  >
                    <Percent size={12} />
                    {displayMode === "percentage" ? "Show values" : "Show %"}
                  </button>
                </div>

                {members.map((member, i) => {
                  const pct = splits[i]?.percentage ?? 0;
                  const isLocked = locked.has(i);
                  const unlocked = members.map((_, j) => j).filter((j) => !locked.has(j));
                  const isSoleRemainder = !isLocked && unlocked.length === 1;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        `
                          flex items-center gap-3 rounded-lg border px-3 py-2
                          transition-colors
                        `,
                        isSoleRemainder
                          ? `
                            border-dashed border-muted-foreground/20 bg-muted/20
                            opacity-60
                          `
                          : isLocked
                            ? "border-foreground/20 bg-foreground/5"
                            : "border-border",
                      )}
                    >
                      <Avatar size="sm">
                        <AvatarImage src={getAvatarUrl(member, member.avatar)} alt={member.name || member.username} />
                        <AvatarFallback>{(member.name || member.username).charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "flex-1 truncate text-sm",
                        isLocked && "text-foreground",
                        isSoleRemainder && "text-muted-foreground",
                      )}>
                        {member.name || member.username}
                      </span>

                      {isSoleRemainder ? (
                        <span className="
                          w-16 text-center text-sm text-muted-foreground
                          tabular-nums
                        ">
                          {formatValue(pct)}
                        </span>
                      ) : (
                        <Input
                          className={cn(
                            `
                              w-16 [appearance:textfield] text-center
                              tabular-nums
                              [&::-webkit-inner-spin-button]:appearance-none
                              [&::-webkit-outer-spin-button]:appearance-none
                            `,
                            isLocked && "font-medium text-foreground",
                          )}
                          type="number"
                          min="0"
                          step={displayMode === "percentage" ? "1" : "0.01"}
                          value={formatValue(pct)}
                          onChange={(e) => handleSplitChange(i, parseFloat(e.target.value) || 0)}
                          onFocus={() => {
                            if (isLocked) toggleLock(i);
                          }}
                        />
                      )}

                      <span className="w-4 text-xs text-muted-foreground">
                        {displayMode === "percentage" ? "%" : ""}
                      </span>
                    </div>
                  );
                })}

                {/* Total */}
                <div className="
                  flex justify-between px-3 py-1.5 text-xs font-medium
                  text-muted-foreground
                ">
                  <span>Total</span>
                  <span>
                    {displayMode === "percentage"
                      ? `${Math.round(splits.reduce((s, x) => s + x.percentage, 0) * 10) / 10}%`
                      : totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          }}
        </form.Subscribe>
      </div>
    );
  },
});
