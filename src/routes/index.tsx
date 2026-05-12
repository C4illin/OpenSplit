import { Button } from "@/components/ui/button";
import { Wrapper } from "@/components/Wrapper";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { finalizeOAuthRedirect, useAuth } from "../hooks/useAuth";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user, isAuthenticated, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [finalizing, setFinalizing] = useState(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("code"),
  );

  useEffect(() => {
    if (!finalizing) return;
    finalizeOAuthRedirect()
      .then(async (ok) => {
        if (ok) await navigate({ to: "/overview" });
      })
      .catch((err) => {
        console.error("OAuth callback failed:", err);
      })
      .finally(() => setFinalizing(false));
  }, [finalizing, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <Wrapper
      className="
      flex min-h-screen flex-col items-center justify-center gap-5
    "
    >
      <h1 className="mb-5 text-7xl font-black">OpenSplit</h1>
      <Button onClick={handleLogin} disabled={isAuthenticated || finalizing} size="lg" className="">
        {finalizing ? "Signing in…" : "Sign in with Google"}
      </Button>
      {isAuthenticated && (
        <>
          <p>
            You are logged in as {user?.displayName} ({user?.email})
          </p>
          <Button onClick={logout}>Logout</Button>
          <Button>
            <a href="/overview">Go to Overview</a>
          </Button>
        </>
      )}
    </Wrapper>
  );
}
