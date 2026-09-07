import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export type BadgePickerItem = {
  id: string;
  name: string;
};

type BadgePickerProps = {
  items?: BadgePickerItem[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<string>;
  label: string;
};

export function BadgePicker({ items, value, onChange, onCreate, label }: BadgePickerProps) {
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
    // Reuse an existing item instead of tripping the unique (group, name) index.
    const existing = (items ?? []).find((item) => item.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id ?? (await onCreate(name));
    onChange(id);
    setDraft("");
    setAdding(false);
  };

  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(items ?? []).map((item) => {
        const selected = value === item.id;
        return (
          <button key={item.id} type="button" onClick={() => toggle(item.id)}>
            <Badge variant={selected ? "default" : "outline"} className="cursor-pointer">
              {item.name}
              {selected && <X />}
            </Badge>
          </button>
        );
      })}
      {adding ? (
        <input
          autoFocus
          value={draft}
          placeholder={`${capitalized} name`}
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
            New {label.toLowerCase()}
          </Badge>
        </button>
      )}
    </div>
  );
}
