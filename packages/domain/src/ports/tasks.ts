import type { Task } from "../models/task";
import type { Period } from "../models/habit";
import type { Unsubscribe } from "./types";

export interface TaskRepository {
  subscribeTasks(onTasks: (tasks: Task[]) => void): Unsubscribe;
  addTask(title: string, scope?: Period, createdAt?: Date): Promise<string>;
  toggleTask(task: Task): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  updateTaskTitle(taskId: string, title: string): Promise<void>;
  updateTask(taskId: string, updates: { title?: string; scope?: Period }): Promise<void>;
}
