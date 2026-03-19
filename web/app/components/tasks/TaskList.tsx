"use client";

import { useState } from "react";
import { Task, TaskScope, Project, getTaskVisibility, taskPeriodKey, HabitPeriod, formatPeriodKey } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { TaskAddModal } from "./TaskAddModal";
import { TaskItem } from "./TaskItem";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useCalendarStore } from "../../stores/calendar";

interface TaskListProps {
  tasks: Task[];
  onToggleCompleted: (taskId: string) => void;
  projects?: Project[];
  hideHeader?: boolean;
  scopeFilter?: TaskScope;
  showScopeLabel?: boolean;
}

function scopeToPeriod(scope: TaskScope): HabitPeriod {
  if (scope === "day") return HabitPeriod.Day;
  if (scope === "month") return HabitPeriod.Month;
  return HabitPeriod.Week;
}

export function TaskList({
  tasks,
  onToggleCompleted,
  projects,
  hideHeader,
  scopeFilter,
  showScopeLabel,
}: TaskListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { activeRepos, getProjectRepos, getTaskProjectId } =
    useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDay = selectedDayISO ? new Date(selectedDayISO) : new Date();

  const handleAddTask = (title: string, projectId?: string, scope?: TaskScope) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    repos?.task.addTask(title, scope, selectedDay);
  };

  // Classify tasks by visibility
  const visibleTasks = tasks
    .map((task) => ({
      task,
      visibility: getTaskVisibility(task, selectedDay),
    }))
    .filter(({ visibility }) => visibility !== "hidden")
    .filter(({ task }) => scopeFilter === undefined || (task.scope ?? "week") === scopeFilter);

  const completedCount = visibleTasks.filter(({ task }) => task.completed).length;

  return (
    <div className="flex flex-col gap-2">
      {!hideHeader && (
        <div
          className="flex items-center justify-between rounded-lg border bg-surface py-1 px-4 cursor-pointer select-none"
          onClick={() => setCollapsed((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Tasks</p>
            {collapsed && (
              <p className="text-xs text-foreground/50">
                {completedCount}/{visibleTasks.length}
              </p>
            )}
          </div>
          {(activeRepos || projects) && (
            <div onClick={(e) => e.stopPropagation()}>
              <TaskAddModal
                onSubmit={handleAddTask}
                projects={projects}
                trigger={
                  <Button size="sm" isIconOnly aria-label="Add task" variant="ghost">
                    <Plus />
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

      <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
        <div>
          {visibleTasks.length === 0 && (
            <p className="text-xs text-foreground/60 pt-2">No tasks yet.</p>
          )}
          <div className="flex flex-col gap-0.5 pt-1">
            {[...visibleTasks]
              .sort((a, b) => Number(a.task.completed) - Number(b.task.completed))
              .map(({ task, visibility }) => {
                const projectName = projects
                  ? projects.find((p) => p.id === getTaskProjectId(task.id))?.name
                  : undefined;
                const openSinceLabel = visibility === "past_open"
                  ? `since ${formatPeriodKey(taskPeriodKey(task), scopeToPeriod(task.scope ?? "week"))}`
                  : undefined;
                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleCompleted={onToggleCompleted}
                    projectName={projectName}
                    openSinceLabel={openSinceLabel}
                    showScopeLabel={showScopeLabel}
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
