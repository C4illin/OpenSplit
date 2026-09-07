import { BadgePicker } from "@/components/BadgePicker";
import { useCategories, useCreateCategory } from "@/hooks/useApi";

type CategoryPickerProps = {
  groupId: string;
  /** Selected category id, or "" for none. */
  value: string;
  onChange: (id: string) => void;
};

export function CategoryPicker({ groupId, value, onChange }: CategoryPickerProps) {
  const { data: categories } = useCategories(groupId);
  const createCategory = useCreateCategory();

  return (
    <BadgePicker
      items={categories}
      value={value}
      onChange={onChange}
      onCreate={async (name) => (await createCategory.mutateAsync({ group: groupId, name })).id}
      label="category"
    />
  );
}
