import PocketBase from "pocketbase";
import type { TypedPocketBase } from "@/types/pocketbase-types";

const pocketbaseUrl =
  import.meta.env.VITE_POCKETBASE_URL || "http://localhost:8090";

export const pb = new PocketBase(pocketbaseUrl) as TypedPocketBase;

// Enable auto-refresh for auth
pb.autoCancellation(false);
