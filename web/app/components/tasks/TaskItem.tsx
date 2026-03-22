"use client";

import { useState } from "react";
import { Task } from "@weekly/domain";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { Badge } from "../general/Badge";
import { PeriodBadge } from "../general/PeriodBadge";
import { TaskDetailsModal } from "./TaskDetailsModal";

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
        {projectName && (
          <Badge className="bg-foreground/10 text-foreground/50">
            {projectName}
          </Badge>
        )}
        <span
          className={[
            "flex-1 truncate text-sm text-foreground",
            task.completed ? "line-through" : "",
          ].join(" ")}
        >
          {task.title}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {showScopeLabel !== false && <PeriodBadge period={scope} />}
          {openSinceLabel && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {openSinceLabel}
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
