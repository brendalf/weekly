import type { Task } from "../models/task";
import type { Unsubscribe } from "./types";

export interface TaskRepository {
  subscribeTasks(userId: string, onTasks: (tasks: Task[]) => void): Unsubscribe;
  addTask(userId: string, title: string): Promise<void>;
  toggleTask(userId: string, task: Task): Promise<void>;
  deleteTask(userId: string, taskId: string): Promise<void>;
  updateTaskTitle(userId: string, taskId: string, title: string): Promise<void>;
}
