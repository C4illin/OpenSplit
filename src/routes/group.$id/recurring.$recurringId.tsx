import { LinkArrow } from "@/components/LinkArrow";
import { RecurringExpenseForm } from "@/components/RecurringExpenseForm";
import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/Wrapper";
import {
  useDeleteRecurringExpense,
  useGroup,
  useRecurringExpense,
  useUpdateRecurringExpense,
} from "@/hooks/useApi";
import { formatDay } from "@/lib/format";
import { toDayInput } from "@/lib/recurring";
import { requireAuth } from "@/lib/requireAuth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/group/$id/recurring/$recurringId")({
  beforeLoad: requireAuth,
  component: EditRecurringExpensePage,
});

function EditRecurringExpensePage() {
  const { id, recurringId } = Route.useParams();
  const navigate = useNavigate();
  const { data: group } = useGroup(id);
  const { data: recurring, isLoading } = useRecurringExpense(recurringId);
  const updateRecurring = useUpdateRecurringExpense();
  const deleteRecurring = useDeleteRecurringExpense();
  const [error, setError] = useState<string | null>(null);

  const goBack = () => navigate({ to: "/group/$id/recurring", params: { id } });

  if (isLoading || !recurring || !group) {
    return (
      <Wrapper className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </Wrapper>
    );
  }

  const toggleActive = async () => {
    setError(null);
    try {
      await updateRecurring.mutateAsync({
        id: recurringId,
        group: id,
        fields: { active: !recurring.active },
      });
    } catch {
      setError("Couldn't update the recurring expense. Try again.");
    }
  };

  return (
    <Wrapper className="flex min-h-dvh flex-col px-4">
      <div className="flex items-center justify-between pt-6 pb-4">
        <div className="flex flex-row items-center justify-center gap-2">
          <LinkArrow link="/group/$id/recurring" />
          <h1 className="text-lg font-semibold">Edit recurring expense</h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Delete this recurring expense? Expenses already added are kept.")) return;
            try {
              await deleteRecurring.mutateAsync({ id: recurringId, group: id });
            } catch {
              setError("Couldn't delete the recurring expense. Try again.");
              return;
            }
            await goBack();
          }}
          className="
            flex size-8 items-center justify-center rounded-md text-muted-foreground
            transition-colors
            hover:bg-destructive/10 hover:text-destructive
          "
          title="Delete recurring expense"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Status + pause/resume */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {recurring.active
            ? `Active · next ${formatDay(recurring.nextDate)}`
            : "Paused · nothing is added until you resume"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleActive}
          disabled={updateRecurring.isPending}
        >
          {recurring.active ? <Pause size={14} /> : <Play size={14} />}
          {recurring.active ? "Pause" : "Resume"}
        </Button>
      </div>

      <RecurringExpenseForm
        groupId={id}
        members={group.expand?.members ?? []}
        base={group.currency || "sek"}
        initial={recurring}
        submitLabel="Save"
        pendingLabel="Saving..."
        onCancel={goBack}
        onSubmit={async (values) => {
          setError(null);
          // Moving the due day re-anchors the day-of-month for later occurrences.
          const dayChanged = toDayInput(values.nextDate) !== toDayInput(recurring.nextDate);
          try {
            await updateRecurring.mutateAsync({
              id: recurringId,
              group: id,
              fields: { ...values, ...(dayChanged ? { startDate: values.nextDate } : {}) },
            });
          } catch {
            setError("Couldn't save the recurring expense. Try again.");
            return;
          }
          await goBack();
        }}
      >
        {error && <p className="text-sm text-destructive">{error}</p>}
      </RecurringExpenseForm>
    </Wrapper>
  );
}
