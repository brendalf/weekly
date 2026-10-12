import test from "node:test";
import assert from "node:assert/strict";

import { Period } from "../models/habit";
import type { Habit } from "../models/habit";
import type { Task } from "../models/task";
import {
  DEFAULT_WEEK_SCOPE,
  habitCadenceLabel,
  scopeProgress,
  STARTER_HABITS,
  WEEK_SCOPES,
  weekRangeLabel,
  weekdayIndex,
} from "./week";

// ---------------------------------------------------------------------------
// weekRangeLabel
// ---------------------------------------------------------------------------

test("weekRangeLabel collapses the month when the week sits inside one", () => {
  // Mon 2026-03-09 … Sun 2026-03-15
  assert.equal(weekRangeLabel(new Date(2026, 2, 9)), "9 – 15 Mar");
});

test("weekRangeLabel keeps both months when the week straddles two", () => {
  // Mon 2026-03-30 … Sun 2026-04-05
  assert.equal(weekRangeLabel(new Date(2026, 2, 30)), "30 Mar – 5 Apr");
});

test("weekRangeLabel keeps both years across a year boundary", () => {
  // Mon 2025-12-29 … Sun 2026-01-04
  assert.equal(weekRangeLabel(new Date(2025, 11, 29)), "29 Dec 2025 – 4 Jan 2026");
});

// ---------------------------------------------------------------------------
// weekdayIndex
// ---------------------------------------------------------------------------

test("weekdayIndex is Monday-first", () => {
  assert.equal(weekdayIndex(new Date(2026, 2, 9)), 0); // Monday
  assert.equal(weekdayIndex(new Date(2026, 2, 12)), 3); // Thursday
  assert.equal(weekdayIndex(new Date(2026, 2, 15)), 6); // Sunday
});

// ---------------------------------------------------------------------------
// WEEK_SCOPES
// ---------------------------------------------------------------------------

test("WEEK_SCOPES leads with the week, and it is the default scope", () => {
  assert.deepEqual(
    WEEK_SCOPES.map((s) => s.period),
    [Period.WEEK, Period.DAY, Period.MONTH],
  );
  assert.equal(DEFAULT_WEEK_SCOPE, Period.WEEK);
});

// ---------------------------------------------------------------------------
// scopeProgress
// ---------------------------------------------------------------------------

const MONDAY = new Date(2026, 2, 9);
const CREATED = new Date(2026, 2, 1).toISOString();

function habit(id: string, period: Period, extra: Partial<Habit> = {}): Habit {
  return { id, name: id, times: 1, period, createdAt: CREATED, ...extra };
}

function task(id: string, scope: Period, completed = false): Task {
  return { id, title: id, createdAt: CREATED, completed, scope, schedule: MONDAY.toISOString() };
}

test("scopeProgress splits habits and tasks per cadence", () => {
  const habits = [
    habit("h-week", Period.WEEK),
    habit("h-week-2", Period.WEEK),
    habit("h-day", Period.DAY),
  ];
  const tasks = [task("t-week", Period.WEEK, true), task("t-day", Period.DAY)];

  const [week, day, month] = scopeProgress(
    habits,
    tasks,
    MONDAY,
    new Set(["h-week"]),
  );

  assert.deepEqual(week.habits, { done: 1, total: 2 });
  assert.deepEqual(week.tasks, { done: 1, total: 1 });
  assert.equal(week.done, 2);
  assert.equal(week.total, 3);

  assert.deepEqual(day.habits, { done: 0, total: 1 });
  assert.deepEqual(day.tasks, { done: 0, total: 1 });

  assert.equal(month.total, 0);
});

test("scopeProgress leaves a skipped habit out of the denominator", () => {
  const habits = [
    habit("h-skipped", Period.WEEK, { skippedPeriods: ["2026-W11"] }),
    habit("h-live", Period.WEEK),
  ];

  const [week] = scopeProgress(habits, [], MONDAY, new Set());
  assert.deepEqual(week.habits, { done: 0, total: 1 });
});

test("scopeProgress ignores habits that do not run on the selected day", () => {
  // activeDays is Sunday-indexed; 2026-03-09 is a Monday (1).
  const habits = [habit("h-tue", Period.DAY, { activeDays: [2] })];

  const [, day] = scopeProgress(habits, [], MONDAY, new Set());
  assert.equal(day.habits.total, 0);
});

test("scopeProgress counts an unscoped task as a week task", () => {
  const unscoped: Task = {
    id: "t",
    title: "t",
    createdAt: MONDAY.toISOString(),
    completed: false,
  };

  const [week] = scopeProgress([], [unscoped], MONDAY, new Set());
  assert.deepEqual(week.tasks, { done: 0, total: 1 });
});

// ---------------------------------------------------------------------------
// Starter habits
// ---------------------------------------------------------------------------

test("STARTER_HABITS covers every cadence", () => {
  const periods = new Set(STARTER_HABITS.map((h) => h.period));
  assert.deepEqual([...periods].sort(), [Period.DAY, Period.MONTH, Period.WEEK].sort());
  assert.ok(STARTER_HABITS.length >= 3 && STARTER_HABITS.length <= 5);
});

test("habitCadenceLabel reads as plain English", () => {
  assert.equal(habitCadenceLabel(1, Period.DAY), "Every day");
  assert.equal(habitCadenceLabel(1, Period.DAY, "evening"), "Every evening");
  assert.equal(habitCadenceLabel(2, Period.DAY, "morning"), "2× a day");
  assert.equal(habitCadenceLabel(1, Period.WEEK), "Once a week");
  assert.equal(habitCadenceLabel(3, Period.WEEK), "3× a week");
  assert.equal(habitCadenceLabel(1, Period.MONTH), "Once a month");
});
