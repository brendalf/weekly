import { Task } from "../models/task";
import { Period } from "../models/habit";
import { dayKeyOf, monthKeyOf, weekKeyOf } from "./period";

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

export function toggleTaskCompleted(task: Task): Task {
  return {
    ...task,
    completed: !task.completed,
  };
}

/** Returns the period key for the task's creation date under its scope. */
export function taskPeriodKey(task: Task): string {
  const date = new Date(task.createdAt);
  const scope = task.scope ?? Period.WEEK;
  if (scope === Period.DAY) return dayKeyOf(date);
  if (scope === Period.MONTH) return monthKeyOf(date);
  return weekKeyOf(date);
}

/** Returns the period key for the selected day under a given scope. */
export function selectedPeriodKey(scope: Period, selectedDay: Date): string {
  if (scope === Period.DAY) return dayKeyOf(selectedDay);
  if (scope === Period.MONTH) return monthKeyOf(selectedDay);
  return weekKeyOf(selectedDay);
}

export type TaskVisibility = 'current' | 'past_open' | 'hidden';

export function getTaskVisibility(task: Task, selectedDay: Date): TaskVisibility {
  const scope = task.scope ?? Period.WEEK;
  const tpk = taskPeriodKey(task);
  const spk = selectedPeriodKey(scope, selectedDay);

  if (tpk === spk) return 'current';
  if (tpk < spk && !task.completed) return 'past_open';
  return 'hidden';
}
