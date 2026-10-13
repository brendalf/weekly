import test from "node:test";
import assert from "node:assert/strict";

import { taskBucket, taskPeriodKey, taskRescheduleTargets } from "./task";
import { dayKeyOf } from "./period";
import type { Task } from "../models/task";

/**
 * 2026-03-16 is the Monday of ISO week 12, so every date below is easy to
 * place: Mar 16–22 is "this week", Mar 23 onwards is next week.
 */
const TODAY = new Date(2026, 2, 18); // Wednesday of week 12

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Test",
    createdAt: new Date(2026, 2, 18, 9).toISOString(),
    completed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// taskPeriodKey
// ---------------------------------------------------------------------------

test("taskPeriodKey prefers the schedule override over createdAt", () => {
  const task = makeTask({
    scope: 'day',
    createdAt: new Date(2026, 2, 10).toISOString(),
    schedule: new Date(2026, 2, 20).toISOString(),
  });
  assert.equal(taskPeriodKey(task), "2026-03-20");
});

// ---------------------------------------------------------------------------
// taskBucket
// ---------------------------------------------------------------------------

test("taskBucket calls a completed task completed however old it is", () => {
  const task = makeTask({
    completed: true,
    scope: 'day',
    schedule: new Date(2025, 0, 1).toISOString(),
  });
  assert.equal(taskBucket(task, TODAY), 'completed');
});

test("taskBucket judges lateness in the task's own scope", () => {
  const yesterday = makeTask({
    scope: 'day',
    schedule: new Date(2026, 2, 17).toISOString(),
  });
  // The same date under a week scope is still the current week.
  const thisWeek = makeTask({
    scope: 'week',
    schedule: new Date(2026, 2, 17).toISOString(),
  });
  assert.equal(taskBucket(yesterday, TODAY), 'overdue');
  assert.equal(taskBucket(thisWeek, TODAY), 'now');
});

test("taskBucket puts a day task later this week in the current week", () => {
  const friday = makeTask({
    scope: 'day',
    schedule: new Date(2026, 2, 20).toISOString(),
  });
  assert.equal(taskBucket(friday, TODAY), 'now');
});

test("taskBucket pushes a day task past Sunday into later", () => {
  const nextTuesday = makeTask({
    scope: 'day',
    schedule: new Date(2026, 2, 24).toISOString(),
  });
  assert.equal(taskBucket(nextTuesday, TODAY), 'later');
});

test("taskBucket treats this month's month-scoped task as current work", () => {
  const thisMonth = makeTask({
    scope: 'month',
    schedule: new Date(2026, 2, 31).toISOString(),
  });
  const nextMonth = makeTask({
    scope: 'month',
    schedule: new Date(2026, 3, 2).toISOString(),
  });
  const lastMonth = makeTask({
    scope: 'month',
    schedule: new Date(2026, 1, 2).toISOString(),
  });
  assert.equal(taskBucket(thisMonth, TODAY), 'now');
  assert.equal(taskBucket(nextMonth, TODAY), 'later');
  assert.equal(taskBucket(lastMonth, TODAY), 'overdue');
});

test("taskBucket defaults a scopeless task to the week scope", () => {
  const noScope = makeTask({ createdAt: new Date(2026, 2, 16).toISOString() });
  const lastWeek = makeTask({ createdAt: new Date(2026, 2, 9).toISOString() });
  assert.equal(taskBucket(noScope, TODAY), 'now');
  assert.equal(taskBucket(lastWeek, TODAY), 'overdue');
});

test("taskBucket never calls a completed task overdue", () => {
  const done = makeTask({
    completed: true,
    scope: 'week',
    schedule: new Date(2026, 2, 9).toISOString(),
  });
  assert.equal(taskBucket(done, TODAY), 'completed');
});

// ---------------------------------------------------------------------------
// taskRescheduleTargets
// ---------------------------------------------------------------------------

test("taskRescheduleTargets leads with the current period", () => {
  assert.equal(taskRescheduleTargets('day', TODAY)[0].label, "Today");
  assert.equal(taskRescheduleTargets('week', TODAY)[0].label, "This week");
  assert.equal(taskRescheduleTargets('month', TODAY)[0].label, "This month");
});

test("taskRescheduleTargets offers a day task days and a month task months", () => {
  assert.deepEqual(
    taskRescheduleTargets('day', TODAY).map((t) => t.label),
    ["Today", "Tomorrow", "Next week"],
  );
  assert.deepEqual(
    taskRescheduleTargets('month', TODAY).map((t) => t.label),
    ["This month", "Next month"],
  );
});

test("taskRescheduleTargets snaps week targets to the Monday of that week", () => {
  const [thisWeek, nextWeek] = taskRescheduleTargets('week', TODAY);
  assert.equal(dayKeyOf(thisWeek.date), "2026-03-16", "Monday of week 12");
  assert.equal(dayKeyOf(nextWeek.date), "2026-03-23", "Monday of week 13");
});

test("taskRescheduleTargets lands at noon so a DST shift cannot move the day", () => {
  for (const scope of ['day', 'week', 'month'] as const) {
    for (const target of taskRescheduleTargets(scope, TODAY)) {
      assert.equal(target.date.getHours(), 12, `${scope}/${target.label}`);
    }
  }
});

test("taskRescheduleTargets moves an overdue task into the current period", () => {
  const stale = makeTask({
    scope: 'week',
    schedule: new Date(2026, 1, 9).toISOString(),
  });
  assert.equal(taskBucket(stale, TODAY), 'overdue');

  const [thisWeek] = taskRescheduleTargets('week', TODAY);
  const moved = { ...stale, schedule: thisWeek.date.toISOString() };
  assert.equal(taskBucket(moved, TODAY), 'now');
});
