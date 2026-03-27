"use client";
import { Label, Select, ListBox } from "@heroui/react";

interface WorkspaceFieldProps {
  workspaces: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}

export function WorkspaceField({ workspaces, value, onChange }: WorkspaceFieldProps) {
  if (workspaces.length === 0) return null;
  return (
    <div className="mt-4">
      <Label>Workspace</Label>
      <Select
        fullWidth
        placeholder="Select workspace"
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
            {workspaces.map((w) => (
              <ListBox.Item key={w.id} id={w.id} textValue={w.name}>
                {w.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
