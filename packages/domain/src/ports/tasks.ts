import type { Task, TaskScope } from "../models/task";
import type { Unsubscribe } from "./types";

export interface TaskRepository {
  subscribeTasks(onTasks: (tasks: Task[]) => void): Unsubscribe;
  addTask(title: string, scope?: TaskScope, createdAt?: Date): Promise<void>;
  toggleTask(task: Task): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  updateTaskTitle(taskId: string, title: string): Promise<void>;
  updateTask(taskId: string, updates: { title?: string; scope?: TaskScope }): Promise<void>;
}
