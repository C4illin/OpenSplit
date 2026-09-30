import { GroupDialog } from "@/components/GroupDialog";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrapper } from "@/components/Wrapper";
import { useGroups } from "@/hooks/useApi";
import { getAvatarUrl } from "@/lib/pocketbase";
import { requireAuth } from "@/lib/requireAuth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { User } from "lucide-react";

export const Route = createFileRoute("/overview")({
  beforeLoad: requireAuth,
  component: RouteComponent,
});

function RouteComponent() {
  const { data: groups, isLoading } = useGroups();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header>
        <h1 className="text-xl font-semibold">Your Groups</h1>
        <div className="flex items-center gap-2">
          <Link to="/profile">
            <Button variant="ghost" size="icon" aria-label="Profile">
              <User size={20} />
            </Button>
          </Link>
          <GroupDialog />
        </div>
      </Header>
      <Wrapper className="flex flex-col gap-4 px-2">
        {!groups?.length ? (
          <p>You are not a member of any groups.</p>
        ) : (
          groups.map((group) => (
            <Link to="/group/$id" params={{ id: group.id }} key={group.id}>
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AvatarGroup>
                    {group.expand?.members?.map((member) => (
                      <Avatar key={member.id}>
                        <AvatarImage src={getAvatarUrl(member, member.avatar)} alt={member.name} />
                        <AvatarFallback>
                          {member.name[0] + (member.name.split(" ").pop() ?? "")[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                </CardContent>
                <CardFooter>
                  {group.expand?.members?.length
                    ? `${group.expand.members.length} member${group.expand.members.length > 1 ? "s" : ""}`
                    : "No members yet"}
                </CardFooter>
              </Card>
            </Link>
          ))
        )}
      </Wrapper>
    </>
  );
}
