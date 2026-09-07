import { BadgePicker } from "@/components/BadgePicker";
import { useCreateProject, useProjects } from "@/hooks/useApi";

type ProjectPickerProps = {
  groupId: string;
  /** Selected project id, or "" for none. */
  value: string;
  onChange: (id: string) => void;
};

export function ProjectPicker({ groupId, value, onChange }: ProjectPickerProps) {
  const { data: projects } = useProjects(groupId);
  const createProject = useCreateProject();

  return (
    <BadgePicker
      items={projects}
      value={value}
      onChange={onChange}
      onCreate={async (name) => (await createProject.mutateAsync({ group: groupId, name })).id}
      label="project"
    />
  );
}
