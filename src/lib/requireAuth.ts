import { pb } from "@/lib/pocketbase";
import { redirect, type ParsedLocation } from "@tanstack/react-router";

/**
 * `beforeLoad` guard for routes that need a signed-in user.
 *
 * Unauthenticated visitors are sent to the login page with the path they were
 * trying to reach, so they land back here after signing in. This is what makes
 * invite links and push-notification links work for logged-out users.
 */
export function requireAuth({ location }: { location: ParsedLocation }): void {
  if (!pb.authStore.isValid) {
    throw redirect({ to: "/", search: { redirect: location.href } });
  }
}
