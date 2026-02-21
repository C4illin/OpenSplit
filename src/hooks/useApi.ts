import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "../lib/pocketbase";
import type { Expense, Group, User } from "../types";

// Groups
export const useGroups = () => {
  const userId = pb.authStore.record?.id;
  return useQuery({
    queryKey: ["groups", userId],
    queryFn: async () => {
      return await pb.collection("groups").getFullList<Group>({
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
    queryKey: ["group", groupId],
    queryFn: async () => {
      return await pb.collection("groups").getOne<Group>(groupId);
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const userId = pb.authStore.record?.id;
      return await pb.collection("groups").create<Group>({
        ...data,
        members: userId ? [userId] : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

// People
export const usePeople = (groupId: string) => {
  return useQuery({
    queryKey: ["people", groupId],
    queryFn: async () => {
      return await pb.collection("people").getFullList<User>({
        filter: `group = "${groupId}"`,
        sort: "name",
      });
    },
    enabled: !!groupId,
  });
};

export const useAddPerson = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return await pb.collection("people").create<User>({
        ...data,
        group: groupId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people", groupId] });
    },
  });
};

// Expenses
export const useExpenses = (groupId: string) => {
  return useQuery({
    queryKey: ["expenses", groupId],
    queryFn: async () => {
      return await pb.collection("expenses").getFullList<Expense>({
        filter: `group = "${groupId}"`,
        sort: "-date",
        expand: "paidBy,splitAmong",
      });
    },
    enabled: !!groupId,
  });
};

export const useAddExpense = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      description: string;
      amount: number;
      paidBy: string;
      splitAmong: string[];
      date: string;
    }) => {
      return await pb.collection("expenses").create<Expense>({
        ...data,
        group: groupId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
    },
  });
};
