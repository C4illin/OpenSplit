import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Wrapper } from "@/components/Wrapper";
import { pb } from "@/lib/pocketbase";
import { cn } from "cn";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { finalizeOAuthRedirect, getAuthErrorMessage, useAuth } from "../hooks/useAuth";

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

type AuthMode = "login" | "register" | "forgot-password";

function RouteComponent() {
  const { loginWithGoogle, loginWithPassword, registerWithPassword, requestPasswordReset } =
    useAuth();
  const navigate = useNavigate();
  const { redirect: returnTo } = Route.useSearch();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setErrorMessage(getAuthErrorMessage(err));
      })
      .finally(() => setFinalizing(false));
  }, [finalizing, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await loginWithPassword(email, password);
      await navigate({ href: returnTo ?? "/overview" });
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerWithPassword({
        email,
        password,
        passwordConfirm,
        name: name.trim() || undefined,
      });
      await navigate({ href: returnTo ?? "/overview" });
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSuccessMessage(
        "If an account exists with this email, password reset instructions have been sent.",
      );
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      await loginWithGoogle(returnTo);
    } catch (err) {
      console.error("Google login failed:", err);
      setErrorMessage(getAuthErrorMessage(err));
    }
  };

  return (
    <Wrapper className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="
              text-4xl font-black tracking-tight
              sm:text-5xl
            "
          >
            OpenSplit
          </h1>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl">
              {mode === "login" && "Sign in"}
              {mode === "register" && "Create an account"}
              {mode === "forgot-password" && "Reset your password"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Enter your email and password to continue"}
              {mode === "register" && "Sign up to start splitting expenses"}
              {mode === "forgot-password" && "Enter your email to receive a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mode !== "forgot-password" && (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-center transition-all",
                    mode === "login"
                      ? "bg-background font-semibold text-foreground shadow-xs"
                      : `
                        text-muted-foreground
                        hover:text-foreground
                      `,
                  )}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={cn(
                    "rounded-md py-1.5 text-center transition-all",
                    mode === "register"
                      ? "bg-background font-semibold text-foreground shadow-xs"
                      : `
                        text-muted-foreground
                        hover:text-foreground
                      `,
                  )}
                >
                  Create account
                </button>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="
                  rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm
                  text-destructive
                "
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="
                  rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm
                  text-emerald-600
                  dark:text-emerald-400
                "
              >
                {successMessage}
              </div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    required
                    enterKeyHint="next"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting || finalizing}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="current-password">Password</FieldLabel>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot-password");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="
                        text-xs text-muted-foreground underline underline-offset-4
                        hover:text-foreground
                      "
                    >
                      Forgot password?
                    </button>
                  </div>
                  <InputGroup>
                    <InputGroupInput
                      id="current-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      enterKeyHint="done"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting || finalizing}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <Button type="submit" disabled={isSubmitting || finalizing} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="name">Name (optional)</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    enterKeyHint="next"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting || finalizing}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="register-email">Email</FieldLabel>
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    required
                    enterKeyHint="next"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting || finalizing}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="new-password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="new-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      enterKeyHint="next"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting || finalizing}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>At least 8 characters</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="confirm-password"
                      name="passwordConfirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      enterKeyHint="done"
                      placeholder="Repeat password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      disabled={isSubmitting || finalizing}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <Button type="submit" disabled={isSubmitting || finalizing} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            )}

            {mode === "forgot-password" && (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    required
                    enterKeyHint="done"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </Field>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Sending link…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full"
                >
                  Back to sign in
                </Button>
              </form>
            )}

            {mode !== "forgot-password" && (
              <>
                <FieldSeparator>or</FieldSeparator>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting || finalizing}
                  className="w-full"
                >
                  <img
                    src="/g-crop.webp"
                    alt=""
                    className="mr-1.5 size-4 object-contain"
                    aria-hidden="true"
                  />
                  {finalizing ? "Signing in with Google…" : "Continue with Google"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Wrapper>
  );
}
