import { Header } from "@/components/Header";
import { InviteDialog } from "@/components/InviteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wrapper } from "@/components/Wrapper";
import { useExpenses, useGroup, useSettlements, useSplits } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { computeBalances } from "@/lib/balances";
import { getAvatarUrl, pb } from "@/lib/pocketbase";
import type { IsoDateString } from "@/types/pocketbase-types.gen";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowRightLeft, Plus } from "lucide-react";
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
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      trailingZeroDisplay: "stripIfInteger",
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function RouteComponent() {
  "use no memo";
  const { id } = Route.useParams();
  const { data: group } = useGroup(id);
  const { data: expenses, isLoading } = useExpenses(id);
  const { data: splits } = useSplits(id);
  const { data: settlements } = useSettlements(id);
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const currency = expenses?.[0]?.currency ?? "SEK";

  const balances = useMemo(() => {
    const members = group?.expand?.members ?? [];
    if (!expenses || !splits || !members.length) return [];
    return computeBalances(members, expenses, splits, settlements);
  }, [group?.expand?.members, expenses, splits, settlements]);

  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: expenses?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    gap: 12,
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
            {balances.map(({ member, balance }) => {
              const isYou = member.id === user?.id;
              return (
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
                  <span className="flex-1 truncate text-sm">
                    {isYou ? "You" : member.name || member.username}
                  </span>
                  {balance === 0 ? (
                    <span className="text-sm text-muted-foreground">settled up</span>
                  ) : (
                    <span className="text-sm">
                      <span className="text-muted-foreground">
                        {balance > 0
                          ? isYou
                            ? "get back"
                            : "gets back"
                          : isYou
                            ? "owe"
                            : "owes"}{" "}
                      </span>
                      <span
                        className={`
                          font-medium
                          ${
                            balance > 0
                              ? `
                                text-green-600
                                dark:text-green-400
                              `
                              : `
                                text-red-600
                                dark:text-red-400
                              `
                          }
                        `}
                      >
                        {formatAmount(Math.abs(balance), currency)}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {balances.length > 0 && (
          <div className="flex justify-end px-4 pb-3">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/group/$id/settle" params={{ id }}>
                <ArrowRightLeft size={16} />
                Settle up
              </Link>
            </Button>
          </div>
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
                      <Card
                        className="
                          h-full justify-center transition-colors
                          hover:bg-muted/50
                        "
                      >
                        <CardContent className="flex items-center gap-3">
                          <Avatar size="sm">
                            {expense.expand?.paidBy && (
                              <AvatarImage
                                src={getAvatarUrl(
                                  expense.expand.paidBy,
                                  expense.expand.paidBy.avatar,
                                )}
                                alt={expense.expand.paidBy.name || expense.expand.paidBy.username}
                              />
                            )}
                            <AvatarFallback>
                              {(
                                expense.expand?.paidBy?.name ??
                                expense.expand?.paidBy?.username ??
                                "?"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{expense.title}</p>
                            <p className="truncate text-muted-foreground">
                              Paid by{" "}
                              {expense.expand?.paidBy?.name ??
                                expense.expand?.paidBy?.username ??
                                "Unknown"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatAmount(expense.amount, expense.currency)}
                            </p>
                            <p className="text-muted-foreground">{formatDate(expense.date)}</p>
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
