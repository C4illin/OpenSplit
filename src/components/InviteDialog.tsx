import { useCreateInvite } from "@/hooks/useApi";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Check, Copy, UserPlus } from "lucide-react";
import { Input } from "./ui/input";

export const InviteDialog = ({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const createInvite = useCreateInvite();
  const [copied, setCopied] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !createInvite.data) {
      createInvite.mutate(groupId);
    }
    if (!isOpen) setCopied(false);
  };

  const inviteUrl = createInvite.data
    ? `${window.location.origin}/invite/${createInvite.data.token}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus size={16} />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to group</DialogTitle>
        </DialogHeader>
        {createInvite.isPending ? (
          <p className="text-sm text-muted-foreground">Generating link...</p>
        ) : createInvite.isError ? (
          <p className="text-sm text-destructive">Failed to create invite link.</p>
        ) : (
          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="flex-1" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
