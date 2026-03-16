"use client";

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
}

export function TaskList({ tasks, onToggleCompleted, projects }: TaskListProps) {
  const { activeRepos, getProjectRepos } = useRepositoryContext();

  const handleAddTask = (title: string, projectId?: string) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    repos?.task.addTask(title);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Tasks</p>
          <p className="text-xs text-foreground/60">Stay on top of your day.</p>
        </div>
        {(activeRepos || projects) && (
          <TaskAddModal
            onSubmit={handleAddTask}
            projects={projects}
            trigger={
              <Button size="sm" isIconOnly aria-label="Add task" variant="ghost">
                <Plus />
              </Button>
            }
          />
        )}
      </div>

      {tasks.length === 0 && (
        <p className="text-xs text-foreground/60">No tasks yet.</p>
      )}

      <div className="flex flex-col gap-0.5">
        {[...tasks]
          .sort((a, b) => Number(a.completed) - Number(b.completed))
          .map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleCompleted={onToggleCompleted}
            />
          ))}
      </div>
    </div>
  );
}
