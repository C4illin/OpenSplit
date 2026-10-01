import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrapper } from "@/components/Wrapper";
import {
  useConverter,
  useCreateSettlement,
  useDeleteSettlement,
  useExpenses,
  useGroup,
  useSettlements,
  useSplits,
} from "@/hooks/useApi";
import { computeBalances, computeSettlements, type Settlement } from "@/lib/balances";
import { formatAmount } from "@/lib/format";
import { availableMethods, type PaymentMethod } from "@/lib/payments";
import { getAvatarUrl, pb } from "@/lib/pocketbase";
import { requireAuth } from "@/lib/requireAuth";
import type { UsersResponse } from "@/types/pocketbase-types.gen";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Settlement details stashed before app-switching to Swish, read back when the
// app-switch callback returns us to this page. Stored in localStorage rather
// than sessionStorage because the callback can land in a fresh browsing
// context (observed on iOS), where sessionStorage starts empty.
const PENDING_KEY = "swish-pending-settlement";
// A stashed settlement older than this belongs to an abandoned attempt.
const PENDING_MAX_AGE_MS = 15 * 60 * 1000;

type PendingSettlement = {
  group: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  label: string;
  stashedAt: number;
};

// Shape of the `result` query param Swish appends on app-switch return,
// observed from a real payment. `result` is "paid" on success.
type SwishCallbackResult = {
  version?: number;
  result?: string;
  amount?: string;
  message?: string;
  payee?: string;
};

export const Route = createFileRoute("/group/$id/settle")({
  beforeLoad: requireAuth,
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
  onMarkPaid,
  onPay,
  isMarking,
  convert,
}: {
  settlement: Settlement;
  currency: string;
  currentUserId: string;
  onMarkPaid: (settlement: Settlement) => void;
  onPay: (settlement: Settlement, method: PaymentMethod, amount: number, currency: string) => void;
  isMarking: boolean;
  convert: (amount: number, from: string, to: string) => number | null;
}) {
  const { from, to, amount } = settlement;
  const viewerIsDebtor = from.id === currentUserId;
  const methods = viewerIsDebtor ? availableMethods(to, from) : [];

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
              methods.flatMap((method) => {
                return method.targetCurrencies.map((reqCurr) => {
                  const targetCode =
                    reqCurr && reqCurr.toLowerCase() !== currency.toLowerCase() ? reqCurr : null;
                  const targetAmount = targetCode ? convert(amount, currency, targetCode) : amount;
                  const canPay = targetAmount !== null;
                  const label = method.buttonLabel ?? `Pay with ${method.name}`;
                  return (
                    <Button
                      key={`${method.id}-${reqCurr || "native"}`}
                      size="sm"
                      disabled={!canPay}
                      onClick={() =>
                        onPay(settlement, method, targetAmount!, targetCode || currency)
                      }
                    >
                      {label}
                      {targetCode && canPay && ` (${formatAmount(targetAmount, targetCode)})`}
                    </Button>
                  );
                });
              })
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
  const deleteSettlement = useDeleteSettlement();
  const convert = useConverter();
  const currentUserId = pb.authStore.record?.id ?? "";

  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);

  const currency = group?.currency || "sek";
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

  const recordPaid = (payload: Omit<PendingSettlement, "stashedAt">) => {
    const { label, ...data } = payload;
    createSettlement.mutate(data, {
      onSuccess: (rec) => setUndo({ id: rec.id, label }),
    });
  };

  const handleMarkPaid = (s: Settlement) => {
    recordPaid({
      group: id,
      from: s.from.id,
      to: s.to.id,
      amount: s.amount,
      currency,
      label: `Marked paid to ${s.to.name || s.to.username}`,
    });
  };

  // Tapping "Pay with Swish" stashes the settlement, then app-switches to Swish.
  // Swish returns to this page (callbackurl) with a `result` query param, which
  // the effect below reads to optimistically record the payment.
  const handlePay = (
    s: Settlement,
    method: PaymentMethod,
    targetAmount: number,
    targetCurrency: string,
  ) => {
    const pending: PendingSettlement = {
      group: id,
      from: s.from.id,
      to: s.to.id,
      amount: s.amount,
      currency,
      label: `Paid ${s.to.name || s.to.username} via ${method.name}`,
      stashedAt: Date.now(),
    };
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    if ((method.id === "vipps" || method.id === "mobilepay") && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(targetAmount.toString()).catch(() => {});
    }

    const callbackUrl = window.location.origin + window.location.pathname;
    window.location.href = method.buildUrl({
      payee: s.to,
      amount: targetAmount,
      currency: targetCurrency,
      message: `OpenSplit: ${groupName}`,
      callbackUrl,
    });
  };

  // Handle the Swish app-switch callback on return to this page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("result")) return;
    const result = params.get("result");
    const raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    // Strip the result param so a manual refresh doesn't re-record.
    window.history.replaceState(null, "", window.location.pathname);
    if (!raw) return;
    let outcome: SwishCallbackResult | null = null;
    try {
      outcome = JSON.parse(result ?? "") as SwishCallbackResult;
    } catch {
      // Unrecognized callback payload — treat as not paid.
    }
    if (outcome?.result !== "paid") return;
    try {
      const { stashedAt, ...pending } = JSON.parse(raw) as PendingSettlement;
      if (Date.now() - stashedAt > PENDING_MAX_AGE_MS) return;
      // The callback comes from the Swish app, not a verified server-side
      // confirmation, so recording is still optimistic — hence the undo prompt.
      recordPaid(pending);
    } catch {
      // Ignore malformed pending data.
    }
    // Run once on mount; mutateAsync is stable across renders.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
  }, []);

  // Auto-dismiss the undo prompt.
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(timer);
  }, [undo]);

  const handleUndo = () => {
    if (!undo) return;
    void deleteSettlement.mutateAsync({ id: undo.id, group: id }).then(() => setUndo(null));
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
                    onMarkPaid={handleMarkPaid}
                    onPay={handlePay}
                    isMarking={createSettlement.isPending}
                    convert={convert}
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
                    onMarkPaid={handleMarkPaid}
                    onPay={handlePay}
                    isMarking={createSettlement.isPending}
                    convert={convert}
                  />
                ))}
              </section>
            )}
          </>
        )}
        {pastSettlements && pastSettlements.length > 0 && (
          <section className="mt-4 flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">History</h2>
            {pastSettlements.map((s) => {
              const from = s.expand?.from;
              const to = s.expand?.to;
              if (!from || !to) return null;
              return (
                <Card key={s.id} size="sm">
                  <CardContent className="flex items-center gap-2">
                    <MemberAvatar member={from} />
                    <span className="text-sm">{from.name || from.username}</span>
                    <ArrowRight size={16} className="text-muted-foreground" />
                    <MemberAvatar member={to} />
                    <span className="text-sm">{to.name || to.username}</span>
                    <div className="ml-auto flex flex-col items-end">
                      <span className="font-medium">{formatAmount(s.amount, s.currency)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </Wrapper>
      {undo && (
        <div
          className="
            fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3
            rounded-lg border bg-card px-4 py-3 shadow-lg
          "
        >
          <span className="text-sm">{undo.label}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={deleteSettlement.isPending}
          >
            {deleteSettlement.isPending ? "Undoing…" : "Undo"}
          </Button>
        </div>
      )}
    </>
  );
}
