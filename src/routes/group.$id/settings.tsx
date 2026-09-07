import { LinkArrow } from "@/components/LinkArrow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrapper } from "@/components/Wrapper";
import {
  useCategories,
  useProjects,
  useCurrencies,
  useDeleteGroup,
  useGroup,
  useUpdateGroup,
} from "@/hooks/useApi";
import { requireAuth } from "@/lib/requireAuth";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/group/$id/settings")({
  beforeLoad: requireAuth,
  component: GroupSettingsPage,
});

function GroupSettingsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Once deletion starts the record is about to 404, so stop fetching it.
  const deleting = deleteGroup.isPending || deleteGroup.isSuccess;
  const { data: group, isLoading } = useGroup(deleting ? "" : id);
  const { data: categories } = useCategories(id);
  const { data: projects } = useProjects(id);
  const { data: currencies } = useCurrencies();

  const currency = currencies?.find((c) => c.id === group?.currency);

  const form = useForm({
    defaultValues: {
      name: group?.name ?? "",
    },
    onSubmit: async ({ value }) => {
      await updateGroup.mutateAsync({ id, name: value.name });
      await navigate({ to: "/group/$id", params: { id } });
    },
  });

  if (isLoading || !group) {
    return (
      <Wrapper className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper className="flex min-h-dvh flex-col px-4">
      <div className="flex items-center gap-2 pt-6 pb-4">
        <LinkArrow link="/group/$id" />
        <h1 className="text-lg font-semibold">Group settings</h1>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
        className="flex flex-1 flex-col gap-6"
      >
        {/* Name */}
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => (value.length < 1 ? "Group name is required" : undefined),
          }}
        >
          {(field) => (
            <Field>
              <Label htmlFor={field.name}>Group name</Label>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors.join(", ")}</p>
              )}
            </Field>
          )}
        </form.Field>

        {/* Currency (read-only) */}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Currency</p>
          <p className="text-sm text-muted-foreground">
            {currency
              ? `${currency.id.toUpperCase()} — ${currency.name}`
              : (group.currency || "sek").toUpperCase()}
          </p>
          <p className="text-xs text-muted-foreground">
            Expenses in other currencies are converted to this at the rate on the day they're added.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Categories</p>
          {categories?.length ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge key={category.id} variant="secondary">
                  {category.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No categories yet. Add them while creating or editing an expense.
            </p>
          )}
        </div>

        {/* Projects */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Projects</p>
          {projects?.length ? (
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <Badge key={project.id} variant="outline">
                  {project.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No projects yet. Add them while creating or editing an expense.
            </p>
          )}
        </div>

        {/* Danger zone */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Danger zone</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" type="button" className="self-start">
                <Trash2 size={16} />
                Delete group
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the group along with all of its expenses, settlements and
                  categories, for every member. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={async () => {
                    setDeleteError(null);
                    try {
                      await deleteGroup.mutateAsync(id);
                      await navigate({ to: "/overview" });
                    } catch {
                      setDeleteError("Couldn't delete the group. Try again.");
                    }
                  }}
                >
                  Delete group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        </div>

        {/* Save */}
        <div className="sticky bottom-0 flex pt-4 pb-6">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                size="lg"
                className="flex-1"
              >
                <Check size={16} />
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Wrapper>
  );
}
