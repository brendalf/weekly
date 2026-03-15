"use client";

import { Task } from "@weekly/domain";
import { Checkbox, Label, Description } from "@heroui/react";

interface TaskItemProps {
  task: Task;
  onToggleCompleted: (taskId: string) => void;
}

export function TaskItem({ task, onToggleCompleted }: TaskItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background hover:border-foreground/20 px-3 py-2">
      <Checkbox
        id={task.id}
        isSelected={task.completed}
        onChange={() => onToggleCompleted(task.id)}
      >
        <Checkbox.Control className="border-2 rounded-full before:rounded-full border-purple-500 data-[selected=true]:bg-purple-500 before:bg-purple-500">
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label htmlFor={task.id}>{task.title}</Label>
          <Description>
            {new Date(task.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Description>
        </Checkbox.Content>
      </Checkbox>
    </div>
  );
}
