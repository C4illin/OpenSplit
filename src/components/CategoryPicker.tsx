import { Badge } from "@/components/ui/badge";
import { useCategories, useCreateCategory } from "@/hooks/useApi";
import { Plus, X } from "lucide-react";
import { useState } from "react";

type CategoryPickerProps = {
  groupId: string;
  /** Selected category id, or "" for none. */
  value: string;
  onChange: (id: string) => void;
};

export function CategoryPicker({ groupId, value, onChange }: CategoryPickerProps) {
  const { data: categories } = useCategories(groupId);
  const createCategory = useCreateCategory();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const toggle = (id: string) => {
    onChange(value === id ? "" : id);
  };

  const commitDraft = async () => {
    const name = draft.trim();
    if (!name) {
      setAdding(false);
      setDraft("");
      return;
    }
    // Reuse an existing category instead of tripping the unique (group, name) index.
    const existing = (categories ?? []).find((c) => c.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id ?? (await createCategory.mutateAsync({ group: groupId, name })).id;
    onChange(id);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(categories ?? []).map((category) => {
        const selected = value === category.id;
        return (
          <button key={category.id} type="button" onClick={() => toggle(category.id)}>
            <Badge variant={selected ? "default" : "outline"} className="cursor-pointer">
              {category.name}
              {selected && <X />}
            </Badge>
          </button>
        );
      })}
      {adding ? (
        <input
          autoFocus
          value={draft}
          placeholder="Category name"
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
            New category
          </Badge>
        </button>
      )}
    </div>
  );
}
