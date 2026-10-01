/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

// take over immediately so pushes are handled by the newest worker
void self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback; the dev service worker has no precache manifest
const allowlist = import.meta.env.DEV ? [/^\/$/] : undefined;
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), { allowlist }));

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
};

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = (event.data?.json() as PushPayload) ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "OpenSplit", {
      body: payload.body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = (event.notification.data?.url as string) ?? "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((w) => "focus" in w);
      if (client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
