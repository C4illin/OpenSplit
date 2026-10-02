import type { TypedPocketBase } from "@/types/pocketbase-types.gen";
import PocketBase from "pocketbase";

// Falls back to same-origin
const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || window.location.origin;

export const pb = new PocketBase(pocketbaseUrl) as TypedPocketBase;

pb.autoCancellation(false);

export function getAvatarUrl(
  record: { id: string; collectionId: string; collectionName: string },
  filename: string,
) {
  if (!filename) return "";
  return pb.files.getURL(record, filename);
}
