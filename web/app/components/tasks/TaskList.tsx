"use client";

import { Task } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { taskRepository } from "../../repositories";
import { TaskAddModal } from "./TaskAddModal";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  userId: string;
  onToggleCompleted: (taskId: string) => void;
}

export function TaskList({ tasks, userId, onToggleCompleted }: TaskListProps) {
  const handleAddTask = (title: string) => {
    taskRepository.addTask(userId, title);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Tasks</p>
          <p className="text-xs text-foreground/60">Stay on top of your day.</p>
        </div>
        <TaskAddModal
          onSubmit={handleAddTask}
          trigger={
            <Button size="sm" isIconOnly aria-label="Add task" variant="ghost">
              <Plus />
            </Button>
          }
        />
      </div>

      {tasks.length === 0 && (
        <p className="text-xs text-foreground/60">No tasks yet.</p>
      )}

      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggleCompleted={onToggleCompleted} />
      ))}
    </div>
  );
}
