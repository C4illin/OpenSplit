import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrapper } from "@/components/Wrapper";
import {
  useCreateSettlement,
  useExpenses,
  useGroup,
  useSettlements,
  useSplits,
} from "@/hooks/useApi";
import { computeBalances, computeSettlements, type Settlement } from "@/lib/balances";
import { formatAmount } from "@/lib/format";
import { availableMethods } from "@/lib/payments";
import { getAvatarUrl, pb } from "@/lib/pocketbase";
import type { UsersResponse } from "@/types/pocketbase-types.gen";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/group/$id/settle")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function MemberAvatar({ member }: { member: UsersResponse }) {
  const label = member.name || member.username;
  return (
    <Avatar size="sm">
      <AvatarImage src={getAvatarUrl(member, member.avatar)} alt={label} />
      <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function SettlementRow({
  settlement,
  currency,
  currentUserId,
  groupName,
  onMarkPaid,
  isMarking,
}: {
  settlement: Settlement;
  currency: string;
  currentUserId: string;
  groupName: string;
  onMarkPaid: (settlement: Settlement) => void;
  isMarking: boolean;
}) {
  const { from, to, amount } = settlement;
  const viewerIsDebtor = from.id === currentUserId;
  const methods = viewerIsDebtor ? availableMethods(to, currency) : [];
  const message = `OpenSplit: ${groupName}`;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MemberAvatar member={from} />
          <span className="text-sm">{from.name || from.username}</span>
          <ArrowRight size={16} className="text-muted-foreground" />
          <MemberAvatar member={to} />
          <span className="text-sm">{to.name || to.username}</span>
          <span className="ml-auto font-medium">{formatAmount(amount, currency)}</span>
        </div>
        {viewerIsDebtor && (
          <div className="flex flex-wrap gap-2">
            {methods.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                {to.name || to.username} hasn't set up a payment method.
              </span>
            ) : (
              methods.map((method) => (
                <Button key={method.id} size="sm" asChild>
                  <a
                    href={method.buildUrl({ payee: to, amount, currency, message })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Pay with {method.name}
                  </a>
                </Button>
              ))
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkPaid(settlement)}
              disabled={isMarking}
            >
              <Check size={16} />
              {isMarking ? "Recording..." : "Mark as paid"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: group } = useGroup(id);
  const { data: expenses } = useExpenses(id);
  const { data: splits } = useSplits(id);
  const { data: pastSettlements } = useSettlements(id);
  const createSettlement = useCreateSettlement();
  const currentUserId = pb.authStore.record?.id ?? "";

  const currency = expenses?.[0]?.currency ?? "SEK";
  const groupName = group?.name ?? "Group";

  const settlements = useMemo(() => {
    const members = group?.expand?.members ?? [];
    if (!expenses || !splits || !members.length) return [];
    const balances = computeBalances(members, expenses, splits, pastSettlements);
    return computeSettlements(balances);
  }, [group?.expand?.members, expenses, splits, pastSettlements]);

  const mine = settlements.filter((s) => s.from.id === currentUserId || s.to.id === currentUserId);
  const others = settlements.filter(
    (s) => s.from.id !== currentUserId && s.to.id !== currentUserId,
  );

  const handleMarkPaid = (s: Settlement) => {
    createSettlement.mutate({
      group: id,
      from: s.from.id,
      to: s.to.id,
      amount: s.amount,
      currency,
    });
  };

  return (
    <>
      <Header link="/group/$id">
        <h1 className="text-xl font-semibold">Settle up</h1>
      </Header>
      <Wrapper className="flex flex-col gap-4 p-4">
        {settlements.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">All settled — nothing to pay.</p>
        ) : (
          <>
            {mine.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">You</h2>
                {mine.map((s) => (
                  <SettlementRow
                    key={`${s.from.id}-${s.to.id}`}
                    settlement={s}
                    currency={currency}
                    currentUserId={currentUserId}
                    groupName={groupName}
                    onMarkPaid={handleMarkPaid}
                    isMarking={createSettlement.isPending}
                  />
                ))}
              </section>
            )}
            {others.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">Between others</h2>
                {others.map((s) => (
                  <SettlementRow
                    key={`${s.from.id}-${s.to.id}`}
                    settlement={s}
                    currency={currency}
                    currentUserId={currentUserId}
                    groupName={groupName}
                    onMarkPaid={handleMarkPaid}
                    isMarking={createSettlement.isPending}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </Wrapper>
    </>
  );
}
