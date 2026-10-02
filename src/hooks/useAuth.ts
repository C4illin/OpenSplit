// src/hooks/useAuth.ts
import { ClientResponseError, type RecordAuthResponse } from "pocketbase";
import { useCallback, useEffect, useState } from "react";
import { pb } from "../lib/pocketbase";
import type { UsersResponse } from "../types/pocketbase-types.gen";

const OAUTH_PENDING_KEY = "oauth_pending";
const OAUTH_PROVIDER = "google";

type PendingOAuth = {
  provider: string;
  state: string;
  codeVerifier: string;
  redirectUrl: string;
  returnTo?: string;
};

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ClientResponseError) {
    const data = err.response?.data;
    if (data && typeof data === "object") {
      // Check email uniqueness error specifically
      const emailField = (data as Record<string, unknown>)["email"];
      const emailMsg =
        typeof emailField === "string"
          ? emailField
          : typeof (emailField as { message?: unknown })?.message === "string"
            ? (emailField as { message: string }).message
            : "";

      if (
        emailMsg.toLowerCase().includes("unique") ||
        (emailField as { code?: unknown })?.code === "validation_not_unique"
      ) {
        return "An account with this email already exists.";
      }

      for (const [key, field] of Object.entries(data)) {
        const msg =
          typeof field === "string"
            ? field
            : typeof (field as { message?: unknown })?.message === "string"
              ? (field as { message: string }).message
              : "";

        if (msg) {
          if (key === "email" && msg.toLowerCase().includes("unique")) {
            return "An account with this email already exists.";
          }
          if (key === "password" && msg.toLowerCase().includes("length")) {
            return "Password must be at least 8 characters long.";
          }
          if (
            key === "passwordConfirm" &&
            (msg.toLowerCase().includes("mismatch") || msg.toLowerCase().includes("match"))
          ) {
            return "Passwords do not match.";
          }
          if (
            key === "oldPassword" &&
            (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("match"))
          ) {
            return "Current password is incorrect.";
          }
          return msg;
        }
      }
    }

    if (err.message && err.message.toLowerCase().includes("unique")) {
      return "An account with this email already exists.";
    }

    if (err.status === 400 && (!err.message || err.message === "Failed to authenticate.")) {
      return "Invalid email or password.";
    }
    return err.message || "An authentication error occurred.";
  }
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes("unique")) {
      return "An account with this email already exists.";
    }
    return err.message;
  }
  return "An unexpected error occurred.";
}

export const useAuth = () => {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record);
    });
    return unsubscribe;
  }, []);

  const loginWithPassword = useCallback(
    async (email: string, password: string): Promise<RecordAuthResponse<UsersResponse>> => {
      return await pb
        .collection("users")
        .authWithPassword<UsersResponse>(email.trim().toLowerCase(), password);
    },
    [],
  );

  const registerWithPassword = useCallback(
    async (data: {
      email: string;
      password: string;
      passwordConfirm: string;
      name?: string;
    }): Promise<RecordAuthResponse<UsersResponse>> => {
      await pb.collection("users").create({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        name: data.name?.trim() || undefined,
      });
      return await pb
        .collection("users")
        .authWithPassword<UsersResponse>(data.email.trim().toLowerCase(), data.password);
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    return await pb.collection("users").requestPasswordReset(email.trim().toLowerCase());
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
    loginWithPassword,
    registerWithPassword,
    requestPasswordReset,
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
