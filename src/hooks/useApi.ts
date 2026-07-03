import { convert, ratesForDate } from "@/lib/rates";
import type {
  CurrenciesResponse,
  ExpensesResponse,
  ExternalauthsResponse,
  GroupsResponse,
  InvitesResponse,
  RatesResponse,
  SettlementsResponse,
  SplitsResponse,
  TagsResponse,
  UsersResponse,
} from "@/types/pocketbase-types.gen";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../lib/pocketbase";

// Currencies and rates change at most once a day and are shared across the app,
// so cache them aggressively.
const DAY = 1000 * 60 * 60 * 24;

export const useCurrencies = () => {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      return await pb.collection("currencies").getFullList<CurrenciesResponse>({ sort: "name" });
    },
    staleTime: DAY,
  });
};

export const useRates = () => {
  return useQuery({
    queryKey: ["rates"],
    queryFn: async () => {
      return await pb.collection("rates").getFullList<RatesResponse>({ sort: "-date" });
    },
    staleTime: DAY,
  });
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

type GroupsExpand = {
  members?: UsersResponse[];
};

// Groups
export const useGroups = () => {
  const userId = pb.authStore.record?.id;
  return useQuery({
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

export const useGroup = (groupId: string) => {
  return useQuery({
    queryKey: ["groups", groupId],
    queryFn: async () => {
      return await pb.collection("groups").getOne<GroupsResponse<GroupsExpand>>(groupId, {
        expand: "members",
      });
    },
    enabled: !!groupId,
  });
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
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

// Tags

export const useTags = (groupId: string) => {
  return useQuery({
    queryKey: ["tags", groupId],
    queryFn: async () => {
      return await pb.collection("tags").getFullList<TagsResponse>({
        filter: `group = "${groupId}"`,
        sort: "name",
      });
    },
    enabled: !!groupId,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { group: string; name: string }) => {
      return await pb.collection("tags").create<TagsResponse>(data);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["tags", variables.group] });
    },
  });
};

// Expenses

type ExpensesExpand = {
  paidBy?: UsersResponse;
  tags?: TagsResponse[];
};

export const useExpenses = (groupId: string) => {
  return useQuery({
    queryKey: ["expenses", groupId],
    queryFn: async () => {
      return await pb.collection("expenses").getFullList<ExpensesResponse<ExpensesExpand>>({
        filter: `group = "${groupId}"`,
        sort: "-date",
        expand: "paidBy,tags",
      });
    },
    enabled: !!groupId,
  });
};

export const useSplits = (groupId: string) => {
  return useQuery({
    queryKey: ["splits", groupId],
    queryFn: async () => {
      return await pb.collection("splits").getFullList<SplitsResponse>({
        filter: `expense.group = "${groupId}"`,
      });
    },
    enabled: !!groupId,
  });
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
  tags: string[];
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
        tags: data.tags,
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
        queryKey: ["expenses", variables.group],
      });
      await queryClient.invalidateQueries({
        queryKey: ["splits", variables.group],
      });
    },
  });
};

type GetExpenseExpand = {
  splits_via_expense?: SplitsResponse[];
};

export const useGetExpense = (expenseId: string) => {
  return useQuery({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      return await pb.collection("expenses").getOne<ExpensesResponse<GetExpenseExpand>>(expenseId, {
        expand: "splits_via_expense",
      });
    },
    enabled: !!expenseId,
  });
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
  tags: string[];
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
        tags: data.tags,
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
        queryKey: ["expense", variables.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["expenses", variables.group],
      });
      await queryClient.invalidateQueries({
        queryKey: ["splits", variables.group],
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
        queryKey: ["expenses", variables.group],
      });
      await queryClient.invalidateQueries({
        queryKey: ["splits", variables.group],
      });
    },
  });
};

// Settlements

type SettlementsExpand = {
  from?: UsersResponse;
  to?: UsersResponse;
};

export const useSettlements = (groupId: string) => {
  return useQuery({
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
        queryKey: ["settlements", variables.group],
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
        queryKey: ["settlements", variables.group],
      });
    },
  });
};

// Profile

export const useCurrentUser = () => {
  const userId = pb.authStore.record?.id;
  return useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      return await pb.collection("users").getOne<UsersResponse>(userId!);
    },
    enabled: !!userId,
  });
};

export const useExternalAuths = () => {
  const userId = pb.authStore.record?.id;
  const collectionId = pb.authStore.record?.collectionId;
  return useQuery({
    queryKey: ["users", userId, "externalAuths", collectionId],
    queryFn: async () => {
      return await pb.collection("_externalAuths").getFullList<ExternalauthsResponse>({
        filter: `recordRef = "${userId}" && collectionRef = "${collectionId}"`,
      });
    },
    enabled: !!userId && !!collectionId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; swish?: string }) => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("Not authenticated");
      return await pb.collection("users").update<UsersResponse>(userId, data);
    },
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: ["users", record.id] });
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
          token: crypto.randomUUID(),
        });
      }
    },
  });
};

export const useInvitePreview = (token: string) => {
  return useQuery({
    queryKey: ["invites", "preview", token],
    queryFn: async () => {
      return (await pb.send(`/api/invites/${token}`, {})) as {
        groupId: string;
        groupName: string;
      };
    },
    enabled: !!token,
  });
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
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};
