import type {
  ExpensesResponse,
  GroupsResponse,
  InvitesResponse,
  SplitsResponse,
  UsersResponse,
} from "@/types/pocketbase-types.gen";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../lib/pocketbase";

type GroupsExpand = {
  members?: UsersResponse[];
};

// Groups
export const useGroups = () => {
  const userId = pb.authStore.record?.id;
  return useQuery({
    queryKey: ["groups", userId],
    queryFn: async () => {
      return await pb
        .collection("groups")
        .getFullList<GroupsResponse<GroupsExpand>>({
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
      return await pb
        .collection("groups")
        .getOne<GroupsResponse<GroupsExpand>>(groupId, {
          expand: "members",
        });
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const userId = pb.authStore.record?.id;
      return await pb.collection("groups").create({
        ...data,
        members: userId ? [userId] : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

// Expenses

type ExpensesExpand = {
  paidBy?: UsersResponse;
};

export const useExpenses = (groupId: string) => {
  return useQuery({
    queryKey: ["expenses", groupId],
    queryFn: async () => {
      return await pb
        .collection("expenses")
        .getFullList<ExpensesResponse<ExpensesExpand>>({
          filter: `group = "${groupId}"`,
          sort: "-date",
          expand: "paidBy",
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
  date: string;
  group: string;
  paidBy: string;
  splits: { user: string; percentage: number }[];
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExpenseData) => {
      const expense = await pb.collection("expenses").create({
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        group: data.group,
        paidBy: data.paidBy,
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["expenses", variables.group],
      });
      queryClient.invalidateQueries({
        queryKey: ["splits", variables.group],
      });
    },
  });
};

export const useGetExpense = (expenseId: string) => {
  return useQuery({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      return await pb.collection("expenses").getOne(expenseId);
    },
    enabled: !!expenseId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};
