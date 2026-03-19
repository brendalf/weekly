"use client";

import { useState } from "react";
import { Task, TaskScope } from "@weekly/domain";
import { Checkbox, Label } from "@heroui/react";
import { TaskDetailsModal } from "./TaskDetailsModal";

const SCOPE_LABELS: Record<TaskScope, string> = {
  day: "Today",
  week: "Week",
  month: "Month",
};

const SCOPE_COLORS: Record<TaskScope, string> = {
  day: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  week: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  month: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
};

interface TaskItemProps {
  task: Task;
  onToggleCompleted: (taskId: string) => void;
  projectName?: string;
  openSinceLabel?: string;
}

export function TaskItem({
  task,
  onToggleCompleted,
  projectName,
  openSinceLabel,
}: TaskItemProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const scope = task.scope ?? "week";

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className={[
          "flex items-center gap-2 rounded-lg border border-foreground/10 bg-background hover:border-foreground/20 p-2 cursor-pointer transition-opacity",
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
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className={["rounded-full px-1.5 py-0.5 text-xs font-medium", SCOPE_COLORS[scope]].join(" ")}>
            {SCOPE_LABELS[scope]}
          </span>
          {openSinceLabel && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
              {openSinceLabel}
            </span>
          )}
          {projectName && (
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/50">
              {projectName}
            </span>
          )}
        </div>
      </div>

      <TaskDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        task={task}
      />
    </>
  );
}
