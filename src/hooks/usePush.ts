import { pb } from "@/lib/pocketbase";
import type { PushSubscriptionsResponse } from "@/types/pocketbase-types.gen";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// The VAPID application server key must be passed as raw bytes.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const findServerSubscription = async (endpoint: string) => {
  try {
    return await pb
      .collection("push_subscriptions")
      .getFirstListItem<PushSubscriptionsResponse>(`endpoint = "${endpoint}"`);
  } catch {
    return null;
  }
};

/** The push subscription of this browser/device, or null when not subscribed. */
export const pushSubscriptionQueryOptions = () =>
  queryOptions({
    queryKey: ["pushSubscription"],
    queryFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    },
    enabled: isPushSupported(),
  });

export const usePushSubscription = () => {
  return useQuery(pushSubscriptionQueryOptions());
};

export const useEnablePush = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userId = pb.authStore.record?.id;
      if (!userId) throw new Error("Not authenticated");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted");
      }

      const { publicKey } = (await pb.send("/api/vapid-public-key", {})) as {
        publicKey: string;
      };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const { endpoint, keys } = subscription.toJSON();
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error("Browser returned an incomplete push subscription");
      }

      // one record per device — re-enabling on the same device updates it
      const data = {
        user: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      };
      const existing = await findServerSubscription(endpoint);
      if (existing) {
        await pb.collection("push_subscriptions").update(existing.id, data);
      } else {
        await pb.collection("push_subscriptions").create(data);
      }

      return subscription;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pushSubscriptionQueryOptions().queryKey });
    },
  });
};

export const useDisablePush = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      const existing = await findServerSubscription(subscription.endpoint);
      await subscription.unsubscribe();
      if (existing) {
        await pb.collection("push_subscriptions").delete(existing.id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pushSubscriptionQueryOptions().queryKey });
    },
  });
};

/** One delivery attempt from `POST /api/push/test`, as reported by the push service. */
export type PushTestResult = {
  subscription: string;
  endpoint: string;
  userAgent: string;
  status?: number;
  error?: string;
  /** The push service said the subscription is gone and the server deleted it. */
  pruned?: boolean;
};

/** Send a test push to every device registered for the current user and report per-device results. */
export const useSendTestPush = () => {
  return useMutation({
    mutationFn: async () => {
      const { results } = (await pb.send("/api/push/test", { method: "POST" })) as {
        results: PushTestResult[];
      };
      return results;
    },
  });
};
