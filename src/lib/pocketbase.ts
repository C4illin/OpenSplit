import PocketBase from "pocketbase";

const pocketbaseUrl =
  import.meta.env.VITE_POCKETBASE_URL || "http://localhost:8090";

export const pb = new PocketBase(pocketbaseUrl);

// Enable auto-refresh for auth
pb.autoCancellation(false);
