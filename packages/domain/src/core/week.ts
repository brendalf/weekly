import { Habit, HabitTimeOfDay, Period } from "../models/habit";
import { Task } from "../models/task";
import { addDays } from "./date";
import { filterHabitsByDay, isHabitSkipped } from "./habit";
import { getTaskVisibility } from "./task";

/**
 * The week planner's domain (PLAN WS4).
 *
 * `/app/week` is the product's hero route (DIRECTION §1: "the week is the unit
 * of commitment"), and everything it needs to answer *"what did I commit to
 * this week, and where am I"* is computed here rather than in the component —
 * the view only paints the numbers.
 */

/* -------------------------------------------------------------------------- */
/* The week label                                                             */
/* -------------------------------------------------------------------------- */

const dayOf = (date: Date) => String(date.getDate());
const monthOf = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });

/**
 * The date span of the week beginning `weekStart`, e.g. `"13 – 19 Oct"`.
 *
 * Collapses whatever the two ends share: the month when the week sits inside
 * one (`"13 – 19 Oct"`), the year when it straddles two months
 * (`"28 Sep – 4 Oct"`), and nothing at all across a year boundary
 * (`"29 Dec 2025 – 4 Jan 2026"`).
 */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && weekStart.getMonth() === end.getMonth();

  if (sameMonth) return `${dayOf(weekStart)} – ${dayOf(end)} ${monthOf(end)}`;
  if (sameYear) {
    return `${dayOf(weekStart)} ${monthOf(weekStart)} – ${dayOf(end)} ${monthOf(end)}`;
  }
  return (
    `${dayOf(weekStart)} ${monthOf(weekStart)} ${weekStart.getFullYear()} – ` +
    `${dayOf(end)} ${monthOf(end)} ${end.getFullYear()}`
  );
}

/** Index of `day` within a Monday-first week: Monday 0 … Sunday 6. */
export function weekdayIndex(day: Date): number {
  return (day.getDay() + 6) % 7;
}

/* -------------------------------------------------------------------------- */
/* Scopes                                                                     */
/* -------------------------------------------------------------------------- */

/** One cadence of commitment, as the week planner presents it. */
export interface WeekScope {
  period: Period;
  label: string;
}

/**
 * The planner's scopes, **week first**.
 *
 * `PERIOD_TABS` leads with the day, which is the inversion DIRECTION §1 calls
 * out: the week is the unit of commitment and the day is where you execute
 * against it. Order is the cheapest way to say so, and the first entry is the
 * route's default scope.
 */
export const WEEK_SCOPES: readonly WeekScope[] = [
  { period: Period.WEEK, label: "Week" },
  { period: Period.DAY, label: "Day" },
  { period: Period.MONTH, label: "Month" },
];

/** The scope `/app/week` opens on. */
export const DEFAULT_WEEK_SCOPE: Period = WEEK_SCOPES[0].period;

/** Done-out-of-total for one list. */
export interface ScopeCount {
  done: number;
  total: number;
}

/** How one cadence is going on the selected day. */
export interface ScopeProgress extends WeekScope {
  habits: ScopeCount;
  tasks: ScopeCount;
  /** `habits.done + tasks.done`. */
  done: number;
  /** `habits.total + tasks.total`. */
  total: number;
}

/**
 * Progress for every scope, from the lists the planner is already showing.
 *
 * Counts **commitments**, so a habit that is skipped for this period leaves
 * the denominator — it was called off, not missed. A row for it may still be
 * on screen (`showSkippedHabits`), which is why the section header and the
 * scope ring both read from here: one number, one definition, no drift.
 *
 * `completedHabitIds` comes from the rendered rows, since completion lives in
 * each habit's own summary subscription rather than on the `Habit` record.
 */
export function scopeProgress(
  habits: Habit[],
  tasks: Task[],
  selectedDay: Date,
  completedHabitIds: ReadonlySet<string>,
): ScopeProgress[] {
  const committed = filterHabitsByDay(habits, selectedDay).filter(
    (habit) => !isHabitSkipped(habit, selectedDay),
  );
  const visibleTasks = tasks.filter(
    (task) => getTaskVisibility(task, selectedDay) !== "hidden",
  );

  return WEEK_SCOPES.map(({ period, label }) => {
    const scopeHabits = committed.filter((habit) => habit.period === period);
    const scopeTasks = visibleTasks.filter(
      (task) => (task.scope ?? Period.WEEK) === period,
    );
    const habitsDone = scopeHabits.filter((habit) =>
      completedHabitIds.has(habit.id),
    ).length;
    const tasksDone = scopeTasks.filter((task) => task.completed).length;

    return {
      period,
      label,
      habits: { done: habitsDone, total: scopeHabits.length },
      tasks: { done: tasksDone, total: scopeTasks.length },
      done: habitsDone + tasksDone,
      total: scopeHabits.length + scopeTasks.length,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Starter habits                                                             */
/* -------------------------------------------------------------------------- */

/** A habit the planner can create in one click, for a workspace with none. */
export interface StarterHabit {
  name: string;
  times: number;
  period: Period;
  timeOfDay?: HabitTimeOfDay;
}

/**
 * What a brand-new week offers instead of `No habits yet.` (DIRECTION §7).
 *
 * Five, deliberately: enough to find something plausible, few enough to read
 * at a glance. Between them they cover all three cadences and two times of
 * day, so picking any one also teaches the model — which is the real job of a
 * first-run list.
 */
export const STARTER_HABITS: readonly StarterHabit[] = [
  { name: "Plan the week", times: 1, period: Period.WEEK },
  { name: "Move your body", times: 3, period: Period.WEEK },
  { name: "Read before bed", times: 1, period: Period.DAY, timeOfDay: "evening" },
  { name: "Walk outside", times: 1, period: Period.DAY, timeOfDay: "morning" },
  { name: "Review the month", times: 1, period: Period.MONTH },
];

/**
 * How often a habit recurs, in words: `"Every day"`, `"Every evening"`,
 * `"3× a week"`.
 *
 * A once-a-day habit with a time of day names it, because "every evening" is
 * both shorter and more concrete than "every day, evening".
 */
export function habitCadenceLabel(
  times: number,
  period: Period,
  timeOfDay?: HabitTimeOfDay,
): string {
  if (period === Period.DAY) {
    if (times !== 1) return `${times}× a day`;
    return timeOfDay ? `Every ${timeOfDay}` : "Every day";
  }
  if (period === Period.WEEK) {
    return times === 1 ? "Once a week" : `${times}× a week`;
  }
  return times === 1 ? "Once a month" : `${times}× a month`;
}
