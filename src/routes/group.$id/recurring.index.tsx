import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrapper } from "@/components/Wrapper";
import { useRecurringExpenses } from "@/hooks/useApi";
import { formatAmount, formatDay } from "@/lib/format";
import { getAvatarUrl } from "@/lib/pocketbase";
import { describeSchedule } from "@/lib/recurring";
import { requireAuth } from "@/lib/requireAuth";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/group/$id/recurring/")({
  beforeLoad: requireAuth,
  component: RecurringExpensesPage,
});

function RecurringExpensesPage() {
  const { id } = Route.useParams();
  const { data: recurring, isLoading } = useRecurringExpenses(id);

  return (
    <>
      <Header link="/group/$id">
        <h1 className="text-xl font-semibold">Recurring expenses</h1>
      </Header>

      <Wrapper>
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Loading...</p>
        ) : !recurring?.length ? (
          <p className="p-8 text-center text-muted-foreground">
            Nothing repeats yet. Add rent, subscriptions or anything else you split on a schedule,
            and it will be added automatically when due.
          </p>
        ) : (
          <ul className="m-4 flex flex-col gap-3">
            {recurring.map((item) => {
              const payer = item.expand?.paidBy;
              const payerName = payer?.name || payer?.username || "Unknown";
              return (
                <li key={item.id}>
                  <Link
                    to="/group/$id/recurring/$recurringId"
                    params={{ id, recurringId: item.id }}
                  >
                    <Card
                      className={cn(
                        `
                          transition-colors
                          hover:bg-muted/50
                        `,
                        !item.active && "opacity-60",
                      )}
                    >
                      <CardContent className="flex items-center gap-3">
                        <Avatar size="sm">
                          {payer && (
                            <AvatarImage src={getAvatarUrl(payer, payer.avatar)} alt={payerName} />
                          )}
                          <AvatarFallback>{payerName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="truncate text-muted-foreground">Paid by {payerName}</p>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <p className="shrink-0 text-muted-foreground">
                              {describeSchedule(item.frequency, item.interval)}
                              {item.active ? ` · next ${formatDay(item.nextDate)}` : " · paused"}
                            </p>
                            {item.expand?.category && (
                              <Badge variant="secondary">{item.expand.category.name}</Badge>
                            )}
                            {item.expand?.project && (
                              <Badge variant="outline">{item.expand.project.name}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="font-semibold">
                            {formatAmount(item.amount, item.currency)}
                          </p>
                          {!item.active && <Badge variant="outline">Paused</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Wrapper>

      <Wrapper className="sticky bottom-16 flex items-center justify-center">
        <Link to="/group/$id/recurring/add" params={{ id }}>
          <Button className="rounded-full shadow-lg" size="lg">
            <Plus size={32} />
            Add recurring expense
          </Button>
        </Link>
      </Wrapper>
    </>
  );
}
