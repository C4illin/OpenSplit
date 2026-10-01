import { convert, ratesForDate } from "@/lib/rates";
import type { RecurringSplit } from "@/lib/recurring";
import type {
  CategoriesResponse,
  CurrenciesResponse,
  ExpensesResponse,
  ExternalauthsResponse,
  GroupsResponse,
  InvitesResponse,
  ProjectsResponse,
  RatesResponse,
  RecurringExpensesFrequencyOptions,
  RecurringExpensesResponse,
  RecurringSplitsResponse,
  SettlementsResponse,
  SplitsResponse,
  UsersResponse,
} from "@/types/pocketbase-types.gen";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../lib/pocketbase";

// Currencies and rates change at most once a day and are shared across the app,
// so cache them aggressively.
const DAY = 1000 * 60 * 60 * 24;

export const currenciesQueryOptions = queryOptions({
  queryKey: ["currencies"],
  queryFn: async () => {
    return await pb.collection("currencies").getFullList<CurrenciesResponse>({ sort: "name" });
  },
  staleTime: DAY,
});

export const useCurrencies = () => {
  return useQuery(currenciesQueryOptions);
};

export const ratesQueryOptions = queryOptions({
  queryKey: ["rates"],
  queryFn: async () => {
    return await pb.collection("rates").getFullList<RatesResponse>({ sort: "-date" });
  },
  staleTime: DAY,
});

export const useRates = () => {
  return useQuery(ratesQueryOptions);
};

/**
 * Returns a converter that locks an amount into a target currency using the
 * ECB snapshot effective on `dateISO` (defaults to now). Returns null when no
 * rate is available, so callers can block instead of silently mis-converting.
 */
export const useConverter = () => {
  const { data: rates } = useRates();
  return (amount: number, from: string, to: string, dateISO?: string): number | null => {
    if (from === to) return convert(amount, from, to, {});
    if (!rates) return null;
    const snapshot = ratesForDate(rates, dateISO ?? new Date().toISOString());
    if (!snapshot) return null;
    return convert(amount, from, to, snapshot.rates);
  };
};

/**
 * Publish date (yyyy-mm-dd) of the ECB snapshot `useConverter` would apply on
 * `dateISO` (defaults to now), or null while rates are loading or none qualify.
 * Lets the UI tell the user when the rate they're seeing is days old.
 */
export const useRateDate = (dateISO?: string): string | null => {
  const { data: rates } = useRates();
  if (!rates) return null;
  return ratesForDate(rates, dateISO ?? new Date().toISOString())?.date ?? null;
};

type GroupsExpand = {
  members?: UsersResponse[];
};

// Groups
export const groupsQueryOptions = () => {
  const userId = pb.authStore.record?.id;
  return queryOptions({
    queryKey: ["groups", userId],
    queryFn: async () => {
      return await pb.collection("groups").getFullList<GroupsResponse<GroupsExpand>>({
        filter: `members ~ "${userId}"`,
        sort: "-created",
        expand: "members",
      });
    },
    enabled: !!userId,
  });
};

export const useGroups = () => {
  return useQuery(groupsQueryOptions());
};

export const groupQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["groups", groupId],
    queryFn: async () => {
      return await pb.collection("groups").getOne<GroupsResponse<GroupsExpand>>(groupId, {
        expand: "members",
      });
    },
    enabled: !!groupId,
  });

export const useGroup = (groupId: string) => {
  return useQuery(groupQueryOptions(groupId));
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; currency?: string }) => {
      const userId = pb.authStore.record?.id;
      return await pb.collection("groups").create({
        ...data,
        currency: data.currency || "sek",
        members: userId ? [userId] : [],
      });
    },
    onSuccess: async () => {
      await // eslint-disable-next-line @tanstack/query/prefer-query-options
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      return await pb.collection("groups").update<GroupsResponse>(data.id, { name: data.name });
    },
    onSuccess: async () => {
      // Covers both the group list (["groups", userId]) and single group (["groups", id]).
      await // eslint-disable-next-line @tanstack/query/prefer-query-options
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Expenses, splits, settlements, invites and categories are removed by
      // cascade delete on their relation fields.
      await pb.collection("groups").delete(id);
    },
    onSuccess: async (_data, id) => {
      // Refetching the deleted group would 404, so drop its query and only
      // mark the rest stale; the list refetches when the overview mounts.
      queryClient.removeQueries({ queryKey: groupQueryOptions(id).queryKey });
      await // eslint-disable-next-line @tanstack/query/prefer-query-options
      queryClient.invalidateQueries({ queryKey: ["groups"], refetchType: "none" });
    },
  });
};

// Categories

export const categoriesQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["categories", groupId],
    queryFn: async () => {
      return await pb.collection("categories").getFullList<CategoriesResponse>({
        filter: `group = "${groupId}"`,
        sort: "name",
      });
    },
    enabled: !!groupId,
  });

export const useCategories = (groupId: string) => {
  return useQuery(categoriesQueryOptions(groupId));
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { group: string; name: string }) => {
      return await pb.collection("categories").create<CategoriesResponse>(data);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: categoriesQueryOptions(variables.group).queryKey,
      });
    },
  });
};

// Projects

export const projectsQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["projects", groupId],
    queryFn: async () => {
      return await pb.collection("projects").getFullList<ProjectsResponse>({
        filter: `group = "${groupId}"`,
        sort: "name",
      });
    },
    enabled: !!groupId,
  });

export const useProjects = (groupId: string) => {
  return useQuery(projectsQueryOptions(groupId));
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { group: string; name: string }) => {
      return await pb.collection("projects").create<ProjectsResponse>(data);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions(variables.group).queryKey,
      });
    },
  });
};

// Expenses

type ExpensesExpand = {
  paidBy?: UsersResponse;
  category?: CategoriesResponse;
  project?: ProjectsResponse;
};

export const expensesQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["expenses", groupId],
    queryFn: async () => {
      return await pb.collection("expenses").getFullList<ExpensesResponse<ExpensesExpand>>({
        filter: `group = "${groupId}"`,
        sort: "-date",
        expand: "paidBy,category,project",
      });
    },
    enabled: !!groupId,
  });

export const useExpenses = (groupId: string) => {
  return useQuery(expensesQueryOptions(groupId));
};

export const splitsQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["splits", groupId],
    queryFn: async () => {
      return await pb.collection("splits").getFullList<SplitsResponse>({
        filter: `expense.group = "${groupId}"`,
      });
    },
    enabled: !!groupId,
  });

export const useSplits = (groupId: string) => {
  return useQuery(splitsQueryOptions(groupId));
};

type CreateExpenseData = {
  title: string;
  amount: number;
  currency: string;
  baseAmount: number;
  date: string;
  group: string;
  paidBy: string;
  splits: { user: string; percentage: number }[];
  category: string;
  project?: string;
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExpenseData) => {
      const expense = await pb.collection("expenses").create({
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        baseAmount: data.baseAmount,
        date: data.date,
        group: data.group,
        paidBy: data.paidBy,
        category: data.category,
        project: data.project,
      });

      await Promise.all(
        data.splits.map((split) =>
          pb.collection("splits").create({
            expense: expense.id,
            user: split.user,
            percentage: split.percentage,
          }),
        ),
      );

      return expense;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: expensesQueryOptions(variables.group).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: splitsQueryOptions(variables.group).queryKey,
      });
    },
  });
};

type GetExpenseExpand = {
  splits_via_expense?: SplitsResponse[];
};

export const getExpenseQueryOptions = (expenseId: string) =>
  queryOptions({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      return await pb.collection("expenses").getOne<ExpensesResponse<GetExpenseExpand>>(expenseId, {
        expand: "splits_via_expense",
      });
    },
    enabled: !!expenseId,
  });

export const useGetExpense = (expenseId: string) => {
  return useQuery(getExpenseQueryOptions(expenseId));
};

type UpdateExpenseData = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  baseAmount: number;
  date: string;
  group: string;
  paidBy: string;
  splits: { user: string; percentage: number }[];
  existingSplitIds: string[];
  category: string;
  project?: string;
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateExpenseData) => {
      const expense = await pb.collection("expenses").update(data.id, {
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        baseAmount: data.baseAmount,
        date: data.date,
        paidBy: data.paidBy,
        category: data.category,
        project: data.project,
      });

      // Delete old splits
      await Promise.all(data.existingSplitIds.map((id) => pb.collection("splits").delete(id)));

      // Create new splits
      await Promise.all(
        data.splits.map((split) =>
          pb.collection("splits").create({
            expense: data.id,
            user: split.user,
            percentage: split.percentage,
          }),
        ),
      );

      return expense;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: getExpenseQueryOptions(variables.id).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: expensesQueryOptions(variables.group).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: splitsQueryOptions(variables.group).queryKey,
      });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; group: string; splitIds: string[] }) => {
      await Promise.all(data.splitIds.map((id) => pb.collection("splits").delete(id)));
      await pb.collection("expenses").delete(data.id);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: expensesQueryOptions(variables.group).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: splitsQueryOptions(variables.group).queryKey,
      });
    },
  });
};

// Recurring expenses
//
// Templates that the server turns into regular expenses on a schedule (see
// pb_hooks/recurring.js). The client only manages the templates and their
// `recurring_splits` rows (one per member, like `splits` for an expense);
// generated expenses show up through the normal ["expenses", groupId] query.

type RecurringExpensesExpand = {
  paidBy?: UsersResponse;
  category?: CategoriesResponse;
  project?: ProjectsResponse;
  recurring_splits_via_recurring?: RecurringSplitsResponse[];
};

export type RecurringExpense = RecurringExpensesResponse<RecurringExpensesExpand>;

export const recurringExpensesQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["recurringExpenses", groupId],
    queryFn: async () => {
      return await pb.collection("recurring_expenses").getFullList<RecurringExpense>({
        filter: `group = "${groupId}"`,
        sort: "-active,nextDate",
        expand: "paidBy,category,project",
      });
    },
    enabled: !!groupId,
  });

export const useRecurringExpenses = (groupId: string) => {
  return useQuery(recurringExpensesQueryOptions(groupId));
};

export const recurringExpenseQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["recurringExpense", id],
    queryFn: async () => {
      return await pb.collection("recurring_expenses").getOne<RecurringExpense>(id, {
        expand: "recurring_splits_via_recurring",
      });
    },
    enabled: !!id,
  });

export const useRecurringExpense = (id: string) => {
  return useQuery(recurringExpenseQueryOptions(id));
};

type RecurringExpenseFields = {
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category: string;
  project?: string;
  frequency: RecurringExpensesFrequencyOptions;
  /** Repeat every N units of `frequency` (1 = every week/month/year). */
  interval: number;
  /** Midnight UTC of the next due day (see fromDayInput). */
  nextDate: string;
  /** Midnight UTC of the last day to repeat on, or "" for no end. */
  endDate: string;
  active: boolean;
};

const createRecurringSplits = (recurringId: string, splits: RecurringSplit[]) =>
  Promise.all(
    splits.map((split) =>
      pb.collection("recurring_splits").create({
        recurring: recurringId,
        user: split.user,
        percentage: split.percentage,
      }),
    ),
  );

export const useCreateRecurringExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: RecurringExpenseFields & { group: string; splits: RecurringSplit[] },
    ) => {
      const { splits, ...fields } = data;
      const recurring = await pb.collection("recurring_expenses").create<RecurringExpense>({
        ...fields,
        // The first due day anchors the day-of-month for every later occurrence.
        startDate: fields.nextDate,
      });
      await createRecurringSplits(recurring.id, splits);
      return recurring;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: recurringExpensesQueryOptions(variables.group).queryKey,
      });
    },
  });
};

type UpdateRecurringExpenseData = {
  id: string;
  group: string;
  fields: Partial<RecurringExpenseFields & { startDate: string }>;
  /** When given, replaces the template's split rows. */
  splits?: { next: RecurringSplit[]; existingIds: string[] };
};

export const useUpdateRecurringExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateRecurringExpenseData) => {
      const recurring = await pb
        .collection("recurring_expenses")
        .update<RecurringExpense>(data.id, data.fields);
      if (data.splits) {
        await Promise.all(
          data.splits.existingIds.map((id) => pb.collection("recurring_splits").delete(id)),
        );
        await createRecurringSplits(data.id, data.splits.next);
      }
      return recurring;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: recurringExpenseQueryOptions(variables.id).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: recurringExpensesQueryOptions(variables.group).queryKey,
      });
    },
  });
};

export const useDeleteRecurringExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; group: string; splitIds: string[] }) => {
      // Split rows point at the template through a required relation, so they
      // go first. Expenses already generated from the template are kept;
      // PocketBase only clears their (non-cascading) `recurring` back-reference.
      await Promise.all(data.splitIds.map((id) => pb.collection("recurring_splits").delete(id)));
      await pb.collection("recurring_expenses").delete(data.id);
    },
    onSuccess: async (_data, variables) => {
      queryClient.removeQueries({ queryKey: recurringExpenseQueryOptions(variables.id).queryKey });
      await queryClient.invalidateQueries({
        queryKey: recurringExpensesQueryOptions(variables.group).queryKey,
      });
    },
  });
};

// Settlements

type SettlementsExpand = {
  from?: UsersResponse;
  to?: UsersResponse;
};

export const settlementsQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: ["settlements", groupId],
    queryFn: async () => {
      return await pb
        .collection("settlements")
        .getFullList<SettlementsResponse<SettlementsExpand>>({
          filter: `group = "${groupId}"`,
          sort: "-created",
          expand: "from,to",
        });
    },
    enabled: !!groupId,
  });

export const useSettlements = (groupId: string) => {
  return useQuery(settlementsQueryOptions(groupId));
};

type CreateSettlementData = {
  group: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
};

export const useCreateSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSettlementData) => {
      return await pb.collection("settlements").create<SettlementsResponse>(data);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: settlementsQueryOptions(variables.group).queryKey,
      });
    },
  });
};

export const useDeleteSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; group: string }) => {
      await pb.collection("settlements").delete(vars.id);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: settlementsQueryOptions(variables.group).queryKey,
      });
    },
  });
};

// Profile

export const currentUserQueryOptions = () => {
  const userId = pb.authStore.record?.id;
  return queryOptions({
    queryKey: ["users", userId],
    queryFn: async () => {
      return await pb.collection("users").getOne<UsersResponse>(userId!);
    },
    enabled: !!userId,
  });
};

export const useCurrentUser = () => {
  return useQuery(currentUserQueryOptions());
};

export const externalAuthsQueryOptions = () => {
  const userId = pb.authStore.record?.id;
  const collectionId = pb.authStore.record?.collectionId;
  return queryOptions({
    queryKey: ["users", userId, "externalAuths", collectionId],
    queryFn: async () => {
      return await pb.collection("_externalAuths").getFullList<ExternalauthsResponse>({
        filter: `recordRef = "${userId}" && collectionRef = "${collectionId}"`,
      });
    },
    enabled: !!userId && !!collectionId,
  });
};

export const useExternalAuths = () => {
  return useQuery(externalAuthsQueryOptions());
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      swish?: string;
      revolut?: string;
      vipps?: string;
      mobilepay?: string;
    }) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("Not authenticated");
      return await pb.collection("users").update<UsersResponse>(userId, data);
    },
    onSuccess: async (record) => {
      await // eslint-disable-next-line @tanstack/query/prefer-query-options
      queryClient.invalidateQueries({ queryKey: ["users", record.id] });
    },
  });
};

// Invites

export const useCreateInvite = () => {
  return useMutation({
    mutationFn: async (groupId: string) => {
      // Check if an invite already exists for this group
      try {
        const existing = await pb
          .collection("invites")
          .getFirstListItem<InvitesResponse>(`group = "${groupId}"`);
        return existing;
      } catch {
        // No existing invite, create one
        return await pb.collection("invites").create<InvitesResponse>({
          group: groupId,
        });
      }
    },
  });
};

export const invitePreviewQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ["invites", "preview", token],
    queryFn: async () => {
      return (await pb.send(`/api/invites/${token}`, {})) as {
        groupId: string;
        groupName: string;
      };
    },
    enabled: !!token,
  });

export const useInvitePreview = (token: string) => {
  return useQuery(invitePreviewQueryOptions(token));
};

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      return (await pb.send(`/api/invites/${token}/accept`, {
        method: "POST",
      })) as { groupId: string };
    },
    onSuccess: async () => {
      await // eslint-disable-next-line @tanstack/query/prefer-query-options
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};
