import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrapper } from "@/components/Wrapper";
import { useCurrentUser, useExternalAuths, useUpdateProfile } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import {
  isPushSupported,
  useDisablePush,
  useEnablePush,
  usePushSubscription,
} from "@/hooks/usePush";
import { getAvatarUrl, pb } from "@/lib/pocketbase";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function formatProvider(provider: string) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function NotificationsCard() {
  const { data: subscription, isLoading } = usePushSubscription();
  const enablePush = useEnablePush();
  const disablePush = useDisablePush();

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
    },
    onSubmit: async ({ value }) => {
      const sanitized = {
        name: value.name,
        swish: value.swish.replace(/[\s-]/g, ""),
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
      <Wrapper className="flex flex-col gap-4">
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
                      placeholder="07XX XXX XX XX"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
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

        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </Wrapper>
    </>
  );
}
