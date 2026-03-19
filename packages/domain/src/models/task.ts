export type TaskScope = 'day' | 'week' | 'month';

export interface Task {
  id: string;
  title: string;
  createdAt: string;
  completed: boolean;
  /** Scope for which the task is relevant. Absent → treat as 'week'. */
  scope?: TaskScope;
}
