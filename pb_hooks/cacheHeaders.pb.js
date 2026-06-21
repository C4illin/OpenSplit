/// <reference path="../pb_data/types.d.ts" />

// Set explicit Cache-Control headers for the static frontend.
routerUse((e) => {
  const path = e.request.url.path;

  if (path.startsWith("/assets/") || path.startsWith("/workbox-")) {
    // Content-hashed: filename changes when content changes, so cache hard.
    e.response.header().set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (
    (e.request.method === "GET" || e.request.method === "HEAD") &&
    !path.startsWith("/api/") &&
    !path.startsWith("/_/")
  ) {
    // The app shell, service worker and manifest must always be revalidated
    // so a new release is picked up on the next navigation.
    e.response.header().set("Cache-Control", "no-cache");

    // PocketBase serves .webmanifest as text/plain; correct it so the PWA
    // manifest is recognized.
    if (path.endsWith(".webmanifest")) {
      e.response.header().set("Content-Type", "application/manifest+json; charset=utf-8");
    }
  }

  return e.next();
});
