"use client";

import { useState } from "react";
import { Task, TaskScope } from "@weekly/domain";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { Badge } from "../general/Badge";
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
  showScopeLabel?: boolean;
}

export function TaskItem({
  task,
  onToggleCompleted,
  projectName,
  openSinceLabel,
  showScopeLabel = true,
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
        <div onClick={(e) => e.stopPropagation()}>
          <CircularCheckboxProgress
            size={28}
            stroke={4}
            progress={task.completed ? 1 : 0}
            complete={task.completed}
            onClick={() => onToggleCompleted(task.id)}
            ariaLabel={task.completed ? "Mark incomplete" : "Mark complete"}
          />
        </div>
        <span
          className={[
            "flex-1 truncate text-sm text-foreground",
            task.completed ? "line-through" : "",
          ].join(" ")}
        >
          {task.title}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {showScopeLabel !== false && (
            <Badge className={SCOPE_COLORS[scope]}>
              {SCOPE_LABELS[scope]}
            </Badge>
          )}
          {openSinceLabel && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {openSinceLabel}
            </Badge>
          )}
          {projectName && (
            <Badge className="bg-foreground/10 text-foreground/50">
              {projectName}
            </Badge>
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
