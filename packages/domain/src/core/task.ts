import { Task } from "../models/task";

export function createTaskId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTask(title: string): Task {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Task title cannot be empty");
  }

  return {
    id: createTaskId(),
    title: trimmed,
    createdAt: new Date().toISOString(),
    completed: false,
  };
}
