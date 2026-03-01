import { Header } from "@/components/header";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateGroup, useGroups } from '@/hooks/useApi';
import { pb } from '@/lib/pocketbase';
import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute('/overview')({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: '/' });
    }
  },
  component: RouteComponent,
})

function GroupDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const createGroup = useCreateGroup();

  const form = useForm({
    defaultValues: {
      name: '',
    },
    onSubmit: async ({ value }) => {
      const newGroup = await createGroup.mutateAsync({ name: value.name });
      setDialogOpen(false);
      form.reset();
      navigate({ to: "/group/$id", params: { id: newGroup.id } });
    },
  });
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={20} />New Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new group</DialogTitle>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  value.length < 1 ? 'Group name is required' : undefined,
              }}
            >
              {(field) => (
                <Field>
                  <Label htmlFor={field.name}>Group Name</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
                  )}
                </Field>
              )}
            </form.Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
              </DialogClose>
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Group"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};


function RouteComponent() {
  const { data: groups, isLoading } = useGroups();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header>
        <h1>Your Groups</h1>
        <GroupDialog />
      </Header>
      {!groups?.length ? (
        <p>You are not a member of any groups.</p>
      ) : groups.map((group) => (
        <Link to="/group/$id" params={{ id: group.id }} key={group.id}>
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarGroup>
                {group.expand?.members?.map((member) => (
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name[0] + (member.name.split(" ").pop() ?? "")[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            </CardContent>
            <CardFooter>
              {group.expand?.members?.length ? `${group.expand.members.length} member${group.expand.members.length > 1 ? 's' : ''}` : 'No members yet'}
            </CardFooter>
          </Card>
        </Link>
      ))}
    </>
  );
}

