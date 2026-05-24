import type { Period } from "./habit";

export interface Task {
  id: string;
  title: string;
  createdAt: string;
  completed: boolean;
  /** Scope for which the task is relevant. Absent → treat as 'week'. */
  scope?: Period;
  /** Optional override date (ISO string) for which period this task belongs to. Leaves createdAt unchanged. */
  schedule?: string;
}
