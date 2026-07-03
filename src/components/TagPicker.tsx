import { Badge } from "@/components/ui/badge";
import { useCreateTag, useTags } from "@/hooks/useApi";
import { Plus, X } from "lucide-react";
import { useState } from "react";

type TagPickerProps = {
  groupId: string;
  /** Selected tag ids. */
  value: string[];
  onChange: (ids: string[]) => void;
};

export function TagPicker({ groupId, value, onChange }: TagPickerProps) {
  const { data: tags } = useTags(groupId);
  const createTag = useCreateTag();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const commitDraft = async () => {
    const name = draft.trim();
    if (!name) {
      setAdding(false);
      setDraft("");
      return;
    }
    // Reuse an existing tag instead of tripping the unique (group, name) index.
    const existing = (tags ?? []).find((t) => t.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id ?? (await createTag.mutateAsync({ group: groupId, name })).id;
    if (!value.includes(id)) onChange([...value, id]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(tags ?? []).map((tag) => {
        const selected = value.includes(tag.id);
        return (
          <button key={tag.id} type="button" onClick={() => toggle(tag.id)}>
            <Badge variant={selected ? "default" : "outline"} className="cursor-pointer">
              {tag.name}
              {selected && <X />}
            </Badge>
          </button>
        );
      })}
      {adding ? (
        <input
          autoFocus
          value={draft}
          placeholder="Tag name"
          maxLength={30}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Don't submit the surrounding expense form.
              e.preventDefault();
              void commitDraft();
            } else if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          className="
            h-5 w-24 rounded-4xl border border-border bg-transparent px-2 text-xs outline-none
            placeholder:text-muted-foreground/40
            focus:ring-2 focus:ring-ring
          "
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)}>
          <Badge variant="ghost" className="cursor-pointer text-muted-foreground">
            <Plus />
            New tag
          </Badge>
        </button>
      )}
    </div>
  );
}
