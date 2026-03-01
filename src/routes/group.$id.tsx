import { Header } from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useCreateExpense,
  useCreateInvite,
  useExpenses,
  useGroup,
  useSplits,
} from "@/hooks/useApi";
import { pb } from "@/lib/pocketbase";
import type { UsersResponse } from "@/types/pocketbase-types.gen";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Copy, Plus, UserPlus } from "lucide-react";
import { useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/group/$id")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatAmount(amount: number, currency: string) {
  return `${amount} ${currency}`;
}

function RouteComponent() {
  'use no memo';
  const { id } = Route.useParams();
  const { data: group } = useGroup(id);
  const { data: expenses, isLoading } = useExpenses(id);
  const { data: splits } = useSplits(id);
  const [dialogOpen, setDialogOpen] = useState(false);
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
    estimateSize: () => 128 + 16,
    // overscan: 5,
  });

  return (
    <>
      <Header>
        <h1 className="text-xl font-semibold">{group?.name ?? "Group"}</h1>
        <InviteDialog
          groupId={id}
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </Header>


      {balances.length > 0 && (
        <ul className="flex flex-col gap-1 p-4">
          {balances.map(({ member, balance }) => (
            <li key={member.id} className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarImage src={member.avatar} alt={member.name || member.username} />
                <AvatarFallback>
                  {(member.name || member.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm">
                {member.name || member.username}
              </span>
              <span
                className={`
                  text-sm font-medium
                  ${balance > 0 ? `
                    text-green-600
                    dark:text-green-400
                  ` : balance < 0 ? `
                    text-red-600
                    dark:text-red-400
                  ` : `text-muted-foreground`}
                `}
              >
                {balance > 0 ? "+" : ""}
                {balance.toFixed(2)} {expenses?.[0]?.currency ?? "SEK"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Separator />
      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Loading...</p>
      ) : !expenses?.length ? (
        <p className="py-8 text-center text-muted-foreground">
          No expenses yet. Tap + to add one.
        </p>
      ) : (
        <div ref={parentRef} className="px-4">
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
                  <Card className="my-2">
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="
                        flex items-center justify-between text-base
                      ">
                        <span>{expense.title}</span>
                        <span className="font-semibold">
                          {formatAmount(expense.amount, expense.currency)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pt-0 pb-3">
                      <div className="
                        flex items-center justify-between text-sm
                        text-muted-foreground
                      ">
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
                </div>
              );
            })}
          </div>
        </div>
      )}


      <div className="sticky bottom-4 left-4">
        <AddExpenseDialog
          groupId={id}
          members={group?.expand?.members ?? []}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </>
  );
}

function InviteDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createInvite = useCreateInvite();
  const [copied, setCopied] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !createInvite.data) {
      createInvite.mutate(groupId);
    }
    if (!isOpen) setCopied(false);
  };

  const inviteUrl = createInvite.data
    ? `${window.location.origin}/invite/${createInvite.data.token}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus size={16} />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to group</DialogTitle>
        </DialogHeader>
        {createInvite.isPending ? (
          <p className="text-sm text-muted-foreground">Generating link...</p>
        ) : createInvite.isError ? (
          <p className="text-sm text-destructive">Failed to create invite link.</p>
        ) : (
          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="flex-1" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

function AddExpenseDialog({
  groupId,
  members,
  open,
  onOpenChange,
}: {
  groupId: string;
  members: UsersResponse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createExpense = useCreateExpense();
  const currentUserId = pb.authStore.record?.id ?? "";

  const form = useForm({
    defaultValues: {
      title: "",
      amount: "",
      currency: "SEK",
      date: new Date().toISOString().slice(0, 10),
      paidBy: currentUserId,
      splitType: "equal" as "equal" | "custom",
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
        date: new Date(value.date).toISOString(),
        group: groupId,
        paidBy: value.paidBy,
        splits,
      });

      onOpenChange(false);
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="size-12 rounded-full shadow-lg">
          <Plus size={24} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.length < 1 ? "Title is required" : undefined,
            }}
          >
            {(field) => (
              <Field>
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  id={field.name}
                  placeholder="Dinner, groceries..."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </Field>
            )}
          </form.Field>

          <form.Field name="date">
            {(field) => (
              <Field>
                <Label htmlFor={field.name}>Date</Label>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>

          <div className="flex gap-2">
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
                <Field className="flex">
                  <Label htmlFor={field.name}>Amount</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </Field>
              )}
            </form.Field>

            <form.Field name="currency">
              {(field) => (
                <Field>
                  <Label>Currency</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="paidBy">
            {(field) => (
              <Field>
                <Label>Paid by</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>

          <Separator />

          <form.Field name="splitType">
            {(field) => (
              <Field>
                <Label>Split</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as "equal" | "custom")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal split</SelectItem>
                    <SelectItem value="custom">Custom percentages</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.splitType}>
            {(splitType) =>
              splitType === "custom" && (
                <div className="flex flex-col gap-2">
                  {members.map((member, i) => (
                    <form.Field key={member.id} name={`splits[${i}].percentage`}>
                      {(field) => (
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate text-sm">
                            {member.name || member.username}
                          </span>
                          <Input
                            className="w-20"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(parseFloat(e.target.value) || 0)
                            }
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      )}
                    </form.Field>
                  ))}
                </div>
              )
            }
          </form.Subscribe>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Expense"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
