import { Header } from "@/components/Header";
import { InviteDialog } from "@/components/InviteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wrapper } from "@/components/Wrapper";
import { useExpenses, useGroup, useSplits } from "@/hooks/useApi";
import { getAvatarUrl, pb } from "@/lib/pocketbase";
import type { IsoDateString } from "@/types/pocketbase-types.gen";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/group/$id/")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function formatDate(dateStr: IsoDateString) {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function formatAmount(amount: number, currency: string) {
  return `${amount} ${currency}`;
}

function RouteComponent() {
  "use no memo";
  const { id } = Route.useParams();
  const { data: group } = useGroup(id);
  const { data: expenses, isLoading } = useExpenses(id);
  const { data: splits } = useSplits(id);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Calculate net balance per member: positive = is owed, negative = owes
  const balances = useMemo(() => {
    const members = group?.expand?.members ?? [];
    if (!expenses || !splits || !members.length) return [];

    const net: Record<string, number> = {};
    for (const m of members) net[m.id] = 0;

    for (const expense of expenses) {
      // The payer is owed the full amount
      net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.amount;

      // Each split user owes their share
      const expenseSplits = splits.filter((s) => s.expense === expense.id);
      for (const split of expenseSplits) {
        const owed = (split.percentage / 100) * expense.amount;
        net[split.user] = (net[split.user] ?? 0) - owed;
      }
    }

    return members.map((m) => ({
      member: m,
      balance: Math.round((net[m.id] ?? 0) * 100) / 100,
    }));
  }, [group?.expand?.members, expenses, splits]);

  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: expenses?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 128,
    gap: 16,
    // overscan: 5,
  });

  return (
    <>
      <Header link="/overview">
        <h1 className="text-xl font-semibold">{group?.name ?? "Group"}</h1>
        <InviteDialog groupId={id} open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
      </Header>

      <Wrapper>
        {balances.length > 0 && (
          <ul className="flex flex-col gap-1 p-4">
            {balances.map(({ member, balance }) => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarImage
                    src={getAvatarUrl(member, member.avatar)}
                    alt={member.name || member.username}
                  />
                  <AvatarFallback>
                    {(member.name || member.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">{member.name || member.username}</span>
                <span
                  className={`
                    text-sm font-medium
                    ${
                      balance > 0
                        ? `
                          text-green-600
                          dark:text-green-400
                        `
                        : balance < 0
                          ? `
                            text-red-600
                            dark:text-red-400
                          `
                          : `text-muted-foreground`
                    }
                  `}
                >
                  {balance > 0 ? "+" : ""}
                  {balance.toFixed(2)} {expenses?.[0]?.currency ?? "SEK"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Wrapper>

      <Separator />
      <Wrapper>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading...</p>
        ) : !expenses?.length ? (
          <p className="py-8 text-center text-muted-foreground">
            No expenses yet. Tap + to add one.
          </p>
        ) : (
          <div ref={parentRef} className="m-4">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const expense = expenses[virtualItem.index];
                return (
                  <div
                    key={expense.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <Link
                      to="/group/$id/expense/$expenseId"
                      params={{ id: group?.id ?? "", expenseId: expense.id ?? "" }}
                    >
                      <Card>
                        <CardHeader className="px-4 py-3">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span>{expense.title}</span>
                            <span className="font-semibold">
                              {formatAmount(expense.amount, expense.currency)}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pt-0 pb-3">
                          <div
                            className="
                              flex items-center justify-between text-sm text-muted-foreground
                            "
                          >
                            <span>
                              Paid by{" "}
                              {expense.expand?.paidBy?.name ??
                                expense.expand?.paidBy?.username ??
                                "Unknown"}
                            </span>
                            <span>{formatDate(expense.date)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Wrapper>

      <Wrapper className="sticky bottom-16 flex items-center justify-center">
        <Link to="/group/$id/add" params={{ id }}>
          <Button className="rounded-full shadow-lg" size="lg">
            <Plus size={32} />
            Add expense
          </Button>
        </Link>
      </Wrapper>
    </>
  );
}
