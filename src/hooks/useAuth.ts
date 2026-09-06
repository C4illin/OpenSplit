// src/hooks/useAuth.ts
import { useCallback, useEffect, useState } from "react";
import { pb } from "../lib/pocketbase";

const OAUTH_PENDING_KEY = "oauth_pending";
const OAUTH_PROVIDER = "google";

type PendingOAuth = {
  provider: string;
  state: string;
  codeVerifier: string;
  redirectUrl: string;
  returnTo?: string;
};

export const useAuth = () => {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(async (returnTo?: string) => {
    const authMethods = await pb.collection("users").listAuthMethods();
    const provider = authMethods.oauth2?.providers?.find((p) => p.name === OAUTH_PROVIDER);
    if (!provider) {
      throw new Error("Google OAuth provider is not configured on the server");
    }

    // The OAuth redirect URI must match what's registered with the provider, so the
    // return path is stashed in sessionStorage rather than appended to the URL.
    const redirectUrl = `${window.location.origin}/`;
    const pending: PendingOAuth = {
      provider: provider.name,
      state: provider.state,
      codeVerifier: provider.codeVerifier,
      redirectUrl,
      returnTo,
    };
    sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(pending));

    window.location.href = provider.authURL + redirectUrl;
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
  }, []);

  return {
    user,
    isAuthenticated: pb.authStore.isValid,
    loginWithGoogle,
    logout,
  };
};

export type OAuthResult = {
  /** Path the user was trying to reach before being sent to login, if any. */
  returnTo?: string;
};

export async function finalizeOAuthRedirect(): Promise<OAuthResult | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return null;

  const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
  sessionStorage.removeItem(OAUTH_PENDING_KEY);

  // Always strip the OAuth parameters from the URL, even on failure.
  const cleanUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  };

  if (!raw) {
    cleanUrl();
    return null;
  }

  const pending = JSON.parse(raw) as PendingOAuth;
  if (pending.state !== state) {
    cleanUrl();
    throw new Error("OAuth state mismatch");
  }

  try {
    await pb
      .collection("users")
      .authWithOAuth2Code(pending.provider, code, pending.codeVerifier, pending.redirectUrl);
    return { returnTo: pending.returnTo };
  } finally {
    cleanUrl();
  }
}
