import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Wrapper } from "@/components/Wrapper";
import {
  useChangePassword,
  useCurrentUser,
  useExternalAuths,
  useUpdateProfile,
} from "@/hooks/useApi";
import { getAuthErrorMessage, useAuth } from "@/hooks/useAuth";
import {
  isPushSupported,
  useDisablePush,
  useEnablePush,
  usePushSubscription,
  useSendTestPush,
  type PushTestResult,
} from "@/hooks/usePush";
import { sanitizeRevolutTag } from "@/lib/payments";
import { getAvatarUrl } from "@/lib/pocketbase";
import { requireAuth } from "@/lib/requireAuth";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  component: RouteComponent,
});

function formatProvider(provider: string) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

const browserNames: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const systemNames: [RegExp, string][] = [
  [/iPhone|iPad/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];
const firstMatch = (names: [RegExp, string][], userAgent: string) =>
  names.find(([pattern]) => pattern.test(userAgent))?.[1];

/** Short human label for a registered device, e.g. "Firefox on Linux". */
function describeDevice(userAgent: string) {
  const browser = firstMatch(browserNames, userAgent) ?? "Browser";
  const os = firstMatch(systemNames, userAgent);
  return os ? `${browser} on ${os}` : browser;
}

const isDelivered = (result: PushTestResult) =>
  !result.pruned && !result.error && !!result.status && result.status < 300;

function describeResult(result: PushTestResult) {
  if (result.pruned) return "Expired, removed";
  if (result.error) return `Failed: ${result.error}`;
  if (isDelivered(result)) return "Sent";
  return `Rejected (HTTP ${result.status})`;
}

function TestPushResults({ results, endpoint }: { results: PushTestResult[]; endpoint: string }) {
  const thisDevice = results.find((result) => result.endpoint === endpoint);

  return (
    <div className="flex flex-col gap-2 text-sm">
      {results.length === 0 ? (
        <p className="text-destructive">
          No devices are registered for your account on the server.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {results.map((result) => (
            <li key={result.subscription} className="flex justify-between gap-3">
              <span>
                {result.endpoint === endpoint ? "This device" : describeDevice(result.userAgent)}
              </span>
              <span
                className={
                  isDelivered(result)
                    ? "text-right text-muted-foreground"
                    : "text-right text-destructive"
                }
              >
                {describeResult(result)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!thisDevice ? (
        <p className="text-destructive">
          This device's subscription isn't registered on the server. Disable and re-enable
          notifications to fix it.
        </p>
      ) : isDelivered(thisDevice) ? (
        <p className="text-muted-foreground">
          The push service accepted the message. If nothing appeared, check the browser's and
          system's notification settings for this site.
        </p>
      ) : thisDevice.pruned ? (
        <p className="text-destructive">
          The push service no longer knows this device. Disable and re-enable notifications.
        </p>
      ) : null}
    </div>
  );
}

function NotificationsCard() {
  const { data: subscription, isLoading } = usePushSubscription();
  const enablePush = useEnablePush();
  const disablePush = useDisablePush();
  const testPush = useSendTestPush();

  const supported = isPushSupported();
  const enabled = !!subscription;
  const blocked = supported && !enabled && Notification.permission === "denied";
  const isPending = enablePush.isPending || disablePush.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Get notified on this device when someone adds an expense or settles up.
        </p>
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Push notifications aren't supported in this browser. On iOS, add OpenSplit to your home
            screen first.
          </p>
        ) : blocked ? (
          <p className="text-sm text-destructive">
            Notifications are blocked for this site in your browser settings.
          </p>
        ) : (
          <Button
            variant={enabled ? "outline" : "default"}
            disabled={isLoading || isPending}
            onClick={() => (enabled ? disablePush.mutate() : enablePush.mutate())}
          >
            {isPending ? "Saving..." : enabled ? "Disable on this device" : "Enable on this device"}
          </Button>
        )}
        {enablePush.isError && (
          <p className="text-sm text-destructive">{enablePush.error.message}</p>
        )}
        {subscription && (
          <>
            <Button
              variant="outline"
              disabled={isPending || testPush.isPending}
              onClick={() => testPush.mutate()}
            >
              {testPush.isPending ? "Sending..." : "Send test notification"}
            </Button>
            {testPush.isError && (
              <p className="text-sm text-destructive">{testPush.error.message}</p>
            )}
            {testPush.data && (
              <TestPushResults results={testPush.data} endpoint={subscription.endpoint} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const { data: externalAuths } = useExternalAuths();
  const changePassword = useChangePassword();
  const hasExternalAuth = !!externalAuths?.length;

  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await changePassword.mutateAsync({
        oldPassword: oldPassword || undefined,
        password,
        passwordConfirm,
      });
      setOldPassword("");
      setPassword("");
      setPasswordConfirm("");
      setSaved(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasExternalAuth ? "Set or change password" : "Change password"}</CardTitle>
        {hasExternalAuth && (
          <p className="text-xs text-muted-foreground">
            Setting a password allows you to sign in using either Google or your email and password.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="
                rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm
                text-destructive
              "
            >
              {error}
            </div>
          )}
          {saved && (
            <div
              role="status"
              className="
                rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm
                text-emerald-600
                dark:text-emerald-400
              "
            >
              Password saved successfully. You can now log in with email and password.
            </div>
          )}

          <Field>
            <Label htmlFor="current-profile-password">
              Current password{" "}
              {hasExternalAuth && (
                <span className="font-normal text-muted-foreground">
                  (optional for Google sign-in)
                </span>
              )}
            </Label>
            <InputGroup>
              <InputGroupInput
                id="current-profile-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={
                  hasExternalAuth ? "Leave blank if you haven't set a password" : "••••••••"
                }
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <Label htmlFor="new-profile-password">New password</Label>
            <InputGroup>
              <InputGroupInput
                id="new-profile-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <Label htmlFor="confirm-profile-password">Confirm new password</Label>
            <InputGroup>
              <InputGroupInput
                id="confirm-profile-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Repeat new password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  const { data: user, isLoading } = useCurrentUser();
  const { data: externalAuths } = useExternalAuths();
  const updateProfile = useUpdateProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [hasSaved, setHasSaved] = useState(false);

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      swish: user?.swish ?? "",
      revolut: user?.revolut ?? "",
      vipps: user?.vipps ?? "",
      mobilepay: user?.mobilepay ?? "",
    },
    onSubmit: async ({ value }) => {
      const sanitized = {
        name: value.name,
        swish: value.swish.replace(/[\s-]/g, ""),
        revolut: sanitizeRevolutTag(value.revolut),
        vipps: value.vipps.replace(/[\s-]/g, ""),
        mobilepay: value.mobilepay.replace(/[\s-]/g, ""),
      };
      await updateProfile.mutateAsync(sanitized);
      form.reset(sanitized);
      setHasSaved(true);
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        swish: user.swish ?? "",
        revolut: user.revolut ?? "",
        vipps: user.vipps ?? "",
        mobilepay: user.mobilepay ?? "",
      });
    }
  }, [user, form]);

  const handleLogout = async () => {
    logout();
    await navigate({ to: "/" });
  };

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  const fallback =
    (user.name?.[0] ?? user.email[0] ?? "?").toUpperCase() +
    ((user.name?.split(" ").pop() ?? "")[0] ?? "").toUpperCase();

  return (
    <>
      <Header link="/overview">
        <h1 className="text-xl font-semibold">Profile</h1>
      </Header>
      <Wrapper className="flex flex-col gap-4 px-2 pb-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage src={getAvatarUrl(user, user.avatar)} alt={user.name || user.email} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle>{user.name || "Unnamed"}</CardTitle>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected services</CardTitle>
          </CardHeader>
          <CardContent>
            {!externalAuths?.length ? (
              <p className="text-sm text-muted-foreground">No connected services.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {externalAuths.map((auth) => (
                  <li key={auth.id} className="flex items-center justify-between text-sm">
                    <span>{formatProvider(auth.provider)}</span>
                    <span className="text-muted-foreground">Connected</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <NotificationsCard />

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await form.handleSubmit();
              }}
              className="flex flex-col gap-4"
            >
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <Label htmlFor={field.name}>Name</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="swish"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined;
                    const cleaned = value.replace(/[\s-]/g, "");
                    if (!/^\+?\d{8,16}$/.test(cleaned)) {
                      return "Enter a valid Swish number";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <Label htmlFor={field.name}>Swish number</Label>
                    <Input
                      id={field.name}
                      type="tel"
                      inputMode="tel"
                      placeholder="07N NNN NN NN"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldDescription>Swedish payment service.</FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="revolut"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined;
                    const cleaned = sanitizeRevolutTag(value);
                    if (!cleaned) return undefined;
                    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(cleaned)) {
                      return "Enter a valid Revolut username";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <Label htmlFor={field.name}>Revolut username</Label>
                    <Input
                      id={field.name}
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldDescription>
                      Allows friends to pay you via Revolut, Apple Pay, or card.{" "}
                      <a
                        href="https://revolut.com/referral/?referral-code=emrikwv1g!SEP2-26-AR-H1&geo-redirect"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Sign up here
                      </a>
                      .
                    </FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="vipps"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined;
                    const cleaned = value.replace(/[\s-]/g, "");
                    if (!/^\+\d{8,16}$/.test(cleaned)) {
                      return "Include country code starting with + (e.g. +47...)";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <Label htmlFor={field.name}>Vipps number</Label>
                    <Input
                      id={field.name}
                      type="tel"
                      inputMode="tel"
                      placeholder="+NN NN NNN NN NN"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldDescription>
                      Norwegian payment service with support for Sweden.
                    </FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="mobilepay"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return undefined;
                    const cleaned = value.replace(/[\s-]/g, "");
                    if (!/^\+\d{8,16}$/.test(cleaned)) {
                      return "Include country code starting with + (e.g. +45...)";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <Label htmlFor={field.name}>MobilePay number</Label>
                    <Input
                      id={field.name}
                      type="tel"
                      inputMode="tel"
                      placeholder="+NN NN NNN NN NN"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <FieldDescription>Danish and Finnish payment service.</FieldDescription>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </Field>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
              >
                {([canSubmit, isSubmitting, isDirty]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting || !isDirty}>
                    {isSubmitting ? (
                      "Saving..."
                    ) : hasSaved && !isDirty ? (
                      <>
                        <Check size={16} />
                        Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>

        <ChangePasswordCard />

        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </Wrapper>
    </>
  );
}
