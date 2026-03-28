"use client";

import { useState } from "react";
import {
  Task,
  Period,
  Workspace,
  getTaskVisibility,
  taskPeriodKey,
  formatPeriodKey,
} from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { TaskAddModal } from "./TaskAddModal";
import { TaskItem } from "./TaskItem";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useCalendarStore } from "../../stores/calendar";
import { useWorkspaceStore } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";

interface TaskListProps {
  tasks: Task[];
  onToggleCompleted: (taskId: string) => void;
  workspaces?: Workspace[];
  hideHeader?: boolean;
  scopeFilter?: Period;
  showScopeLabel?: boolean;
  showCompleted?: boolean;
}

export function TaskList({
  tasks,
  onToggleCompleted,
  workspaces,
  hideHeader,
  scopeFilter,
  showScopeLabel,
  showCompleted = true,
}: TaskListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { activeRepos, getWorkspaceRepos, getTaskProjectId } =
    useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDay = selectedDayISO ? new Date(selectedDayISO) : new Date();
  const storeWorkspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const handleAddTask = async (
    title: string,
    workspaceId?: string,
    scope?: Period,
  ) => {
    const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
    const taskId = await repos?.task.addTask(title, scope, selectedDay);
    if (!taskId) return;
    const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
    if (!targetWorkspaceId) return;
    const workspace = storeWorkspaces.find((w) => w.id === targetWorkspaceId);
    const user = auth.currentUser;
    if (!user || !workspace || workspace.members.length < 2) return;
    workspaceRepository
      .logActivity(targetWorkspaceId, {
        type: "task_added",
        actorUid: user.uid,
        actorDisplayName: user.displayName ?? "User",
        itemId: taskId,
        itemName: title,
      })
      .catch(() => {/* non-critical */});
  };

  // Classify tasks by visibility
  const visibleTasks = tasks
    .map((task) => ({
      task,
      visibility: getTaskVisibility(task, selectedDay),
    }))
    .filter(({ visibility }) => visibility !== "hidden")
    .filter(
      ({ task }) =>
        scopeFilter === undefined || (task.scope ?? Period.WEEK) === scopeFilter,
    )
    .filter(({ task }) => showCompleted || !task.completed);

  const completedCount = visibleTasks.filter(
    ({ task }) => task.completed,
  ).length;

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
          {(activeRepos || workspaces) && (
            <div onClick={(e) => e.stopPropagation()}>
              <TaskAddModal
                onSubmit={handleAddTask}
                workspaces={workspaces}
                trigger={
                  <Button
                    size="sm"
                    isIconOnly
                    aria-label="Add task"
                    variant="ghost"
                  >
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
              .sort(
                (a, b) => Number(a.task.completed) - Number(b.task.completed),
              )
              .map(({ task, visibility }) => {
                const projectName = workspaces
                  ? workspaces.find((w) => w.id === getTaskProjectId(task.id))
                      ?.name
                  : undefined;
                const openSinceLabel =
                  visibility === "past_open"
                    ? formatPeriodKey(
                        taskPeriodKey(task),
                        task.scope ?? Period.WEEK,
                      )
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
