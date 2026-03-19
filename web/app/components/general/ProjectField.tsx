"use client";
import { Label, Select, ListBox } from "@heroui/react";

interface ProjectFieldProps {
  projects: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}

export function ProjectField({ projects, value, onChange }: ProjectFieldProps) {
  if (projects.length === 0) return null;
  return (
    <div className="mt-4">
      <Label>Project</Label>
      <Select
        fullWidth
        placeholder="Select project"
        variant="secondary"
        value={value}
        onChange={(e) => onChange(e as string)}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {projects.map((p) => (
              <ListBox.Item key={p.id} id={p.id} textValue={p.name}>
                {p.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
