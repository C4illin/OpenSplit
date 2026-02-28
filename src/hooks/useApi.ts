import type {
  ExpensesResponse,
  GroupsResponse,
  UsersResponse,
} from "@/types/pocketbase-types";
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
    },
  });
};
