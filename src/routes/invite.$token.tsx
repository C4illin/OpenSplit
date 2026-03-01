import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAcceptInvite, useInvitePreview } from "@/hooks/useApi";
import { pb } from "@/lib/pocketbase";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$token")({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { token } = Route.useParams();
  const { data: preview, isLoading, isError } = useInvitePreview(token);
  const acceptInvite = useAcceptInvite();
  const navigate = useNavigate();

  const handleAccept = async () => {
    const result = await acceptInvite.mutateAsync(token);
    navigate({ to: "/group/$id", params: { id: result.groupId } });
  };

  const handleDecline = () => {
    navigate({ to: "/overview" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Loading invite...</p>
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid invite</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has expired.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleDecline}>
              Go to overview
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {preview.groupName}?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You've been invited to join this group.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={acceptInvite.isPending}
          >
            {acceptInvite.isPending ? "Joining..." : "Accept"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
