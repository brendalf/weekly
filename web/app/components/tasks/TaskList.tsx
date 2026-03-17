"use client";

import { useState } from "react";
import { Task, Project } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { TaskAddModal } from "./TaskAddModal";
import { TaskItem } from "./TaskItem";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

interface TaskListProps {
  tasks: Task[];
  onToggleCompleted: (taskId: string) => void;
  projects?: Project[];
  hideHeader?: boolean;
}

export function TaskList({
  tasks,
  onToggleCompleted,
  projects,
  hideHeader,
}: TaskListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { activeRepos, getProjectRepos, getTaskProjectId } =
    useRepositoryContext();
  const completedCount = tasks.filter((t) => t.completed).length;

  const handleAddTask = (title: string, projectId?: string) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    repos?.task.addTask(title);
  };

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
                {completedCount}/{tasks.length}
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
          {tasks.length === 0 && (
            <p className="text-xs text-foreground/60 pt-2">No tasks yet.</p>
          )}
          <div className="flex flex-col gap-0.5 pt-1">
            {[...tasks]
              .sort((a, b) => Number(a.completed) - Number(b.completed))
              .map((task) => {
                const projectName = projects
                  ? projects.find((p) => p.id === getTaskProjectId(task.id))?.name
                  : undefined;
                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleCompleted={onToggleCompleted}
                    projectName={projectName}
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
