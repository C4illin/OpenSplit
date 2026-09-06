import { LinkArrow } from "@/components/LinkArrow";
import { RecurringExpenseForm } from "@/components/RecurringExpenseForm";
import { Wrapper } from "@/components/Wrapper";
import { useCreateRecurringExpense, useGroup } from "@/hooks/useApi";
import { requireAuth } from "@/lib/requireAuth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/group/$id/recurring/add")({
  beforeLoad: requireAuth,
  component: AddRecurringExpensePage,
});

function AddRecurringExpensePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: group } = useGroup(id);
  const createRecurring = useCreateRecurringExpense();
  const [error, setError] = useState<string | null>(null);

  const goBack = () => navigate({ to: "/group/$id/recurring", params: { id } });

  if (!group) {
    return (
      <Wrapper className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper className="flex min-h-dvh flex-col px-4">
      <div className="flex items-center gap-2 pt-6 pb-4">
        <LinkArrow link="/group/$id/recurring" />
        <h1 className="text-lg font-semibold">New recurring expense</h1>
      </div>

      <RecurringExpenseForm
        groupId={id}
        members={group.expand?.members ?? []}
        base={group.currency || "sek"}
        submitLabel="Add"
        pendingLabel="Adding..."
        onCancel={goBack}
        onSubmit={async (values) => {
          setError(null);
          try {
            await createRecurring.mutateAsync({ ...values, group: id, active: true });
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
