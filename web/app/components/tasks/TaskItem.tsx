"use client";

import { useState } from "react";
import { Task } from "@weekly/domain";
import { Checkbox, Label } from "@heroui/react";
import { TaskDetailsModal } from "./TaskDetailsModal";

interface TaskItemProps {
  task: Task;
  userId: string;
  onToggleCompleted: (taskId: string) => void;
}

export function TaskItem({ task, userId, onToggleCompleted }: TaskItemProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className={[
          "flex items-center gap-2 rounded-xl border border-foreground/10 bg-background hover:border-foreground/20 p-2 cursor-pointer transition-opacity",
          task.completed ? "opacity-50" : "",
        ].join(" ")}
      >
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
          </Checkbox.Content>
        </Checkbox>
      </div>

      <TaskDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        userId={userId}
        task={task}
      />
    </>
  );
}
