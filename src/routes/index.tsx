import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/Wrapper";
import { pb } from "@/lib/pocketbase";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { finalizeOAuthRedirect, useAuth } from "../hooks/useAuth";

type LoginSearch = {
  /** Same-origin path to return to after signing in (e.g. an invite link). */
  redirect?: string;
};

// Only accept same-origin paths so the param can't be abused as an open redirect.
function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    // Don't redirect mid-OAuth-callback; the component finishes the code exchange.
    if (pb.authStore.isValid && !new URLSearchParams(window.location.search).has("code")) {
      throw redirect({ href: search.redirect ?? "/overview" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { redirect: returnTo } = Route.useSearch();
  const [finalizing, setFinalizing] = useState(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("code"),
  );

  useEffect(() => {
    if (!finalizing) return;
    finalizeOAuthRedirect()
      .then(async (result) => {
        if (result) await navigate({ href: result.returnTo ?? "/overview" });
      })
      .catch((err) => {
        console.error("OAuth callback failed:", err);
      })
      .finally(() => setFinalizing(false));
  }, [finalizing, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle(returnTo);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <Wrapper className="flex min-h-screen flex-col items-center justify-center gap-5">
      <h1 className="mb-5 text-7xl font-black">OpenSplit</h1>
      <Button onClick={handleLogin} disabled={finalizing} size="lg" className="">
        {finalizing ? "Signing in…" : "Sign in with Google"}
      </Button>
    </Wrapper>
  );
}
