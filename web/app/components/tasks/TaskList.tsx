"use client";

import { Task } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button, Checkbox } from "@heroui/react";
import { taskRepository } from "../../repositories";
import { TaskAddModal } from "./TaskAddModal";

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
        <div
          key={task.id}
          className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background hover:border-foreground/20 px-3 py-2"
        >
          <Checkbox
            isSelected={task.completed}
            onChange={() => onToggleCompleted(task.id)}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <div className="flex flex-1 flex-col min-w-0">
                <span
                  className={[
                    "text-sm text-foreground truncate",
                    task.completed ? "line-through opacity-50" : "",
                  ].join(" ")}
                >
                  {task.title}
                </span>
                <span className="text-xs text-foreground/40">
                  {new Date(task.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </Checkbox.Content>
          </Checkbox>
        </div>
      ))}
    </div>
  );
}
