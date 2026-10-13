import { Task } from "../models/task";
import { Period } from "../models/habit";
import { addDays, getStartOfWeek } from "./date";
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

/** Returns the period key for the task's scheduled (or creation) date under its scope. */
export function taskPeriodKey(task: Task): string {
  const date = new Date(task.schedule ?? task.createdAt);
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

/**
 * Where a task sits on the backlog (`/app/tasks`, PLAN WS6).
 *
 * - `overdue` — its own scope's period has passed and it is still open.
 * - `now` — it is live in the current week. "This week" is the product's unit
 *   (DIRECTION §1), so a day-scoped task dated Friday belongs here, not in
 *   `later`; a month-scoped task for the current month does too, because it is
 *   work you can pick up this week.
 * - `later` — it is scheduled past this week.
 * - `completed` — done, regardless of when.
 */
export type TaskBucket = 'overdue' | 'now' | 'later' | 'completed';

/**
 * Buckets a task against a reference day — *today* on `/app/tasks`, which is
 * the whole backlog rather than a slice of the week selected elsewhere.
 *
 * Lateness is judged in the task's own scope, so a day-scoped task is overdue
 * a day later while a month-scoped one has until the month ends.
 */
export function taskBucket(task: Task, today: Date): TaskBucket {
  if (task.completed) return 'completed';

  const scope = task.scope ?? Period.WEEK;
  if (taskPeriodKey(task) < selectedPeriodKey(scope, today)) return 'overdue';

  const scheduled = new Date(task.schedule ?? task.createdAt);
  if (scope === Period.MONTH) {
    return monthKeyOf(scheduled) === monthKeyOf(today) ? 'now' : 'later';
  }
  return weekKeyOf(scheduled) === weekKeyOf(today) ? 'now' : 'later';
}

/** A place a task can be moved to: what to call it, and the date it writes. */
export interface TaskRescheduleTarget {
  /** Button/menu label, sentence case: "This week", "Tomorrow". */
  label: string;
  /** The date to store in `Task.schedule`. */
  date: Date;
}

/** Noon, so a date that crosses a DST boundary stays on its own day. */
function atNoon(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Where a task of a given scope can be moved, **current period first**.
 *
 * The targets follow the task's own scope: "next week" on a month-scoped task
 * would mean nothing, so a month task is offered months and a day task days.
 * The leading entry is the current period — the one-click "move to this week"
 * an overdue row and an overdue panel both lead with (DIRECTION §7).
 *
 * Rescheduling writes `Task.schedule`, the override the model already carries,
 * and `taskPeriodKey` prefers it over `createdAt` — so no schema change
 * (DIRECTION §8).
 */
export function taskRescheduleTargets(
  scope: Period,
  today: Date,
): TaskRescheduleTarget[] {
  if (scope === Period.DAY) {
    return [
      { label: 'Today', date: atNoon(today) },
      { label: 'Tomorrow', date: atNoon(addDays(today, 1)) },
      { label: 'Next week', date: atNoon(getStartOfWeek(addDays(today, 7))) },
    ];
  }
  if (scope === Period.MONTH) {
    return [
      {
        label: 'This month',
        date: atNoon(new Date(today.getFullYear(), today.getMonth(), 1)),
      },
      {
        label: 'Next month',
        date: atNoon(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
      },
    ];
  }
  return [
    { label: 'This week', date: atNoon(getStartOfWeek(today)) },
    { label: 'Next week', date: atNoon(getStartOfWeek(addDays(today, 7))) },
  ];
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
