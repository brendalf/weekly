import test from "node:test";
import assert from "node:assert/strict";

import {
  computeStreak,
  getISOWeek,
  isDateInWeek,
  isHabitSucceeded,
  prevPeriodDate,
} from "./habit";

// ---------------------------------------------------------------------------
// isHabitSucceeded
// ---------------------------------------------------------------------------

test("isHabitSucceeded returns false when target <= 0", () => {
  assert.equal(isHabitSucceeded(5, 0), false);
  assert.equal(isHabitSucceeded(5, -1), false);
});

test("isHabitSucceeded returns false when count < target", () => {
  assert.equal(isHabitSucceeded(2, 3), false);
});

test("isHabitSucceeded returns true when count === target", () => {
  assert.equal(isHabitSucceeded(3, 3), true);
});

test("isHabitSucceeded returns true when count > target", () => {
  assert.equal(isHabitSucceeded(4, 3), true);
});

// ---------------------------------------------------------------------------
// getISOWeek
// ---------------------------------------------------------------------------

test("getISOWeek returns correct week for a known Monday", () => {
  // 2026-W11 starts on Monday 2026-03-09
  const { year, week } = getISOWeek(new Date(2026, 2, 9));
  assert.equal(year, 2026);
  assert.equal(week, 11);
});

test("getISOWeek returns correct week for a Sunday at end of week", () => {
  // 2026-W11 ends on Sunday 2026-03-15
  const { year, week } = getISOWeek(new Date(2026, 2, 15));
  assert.equal(year, 2026);
  assert.equal(week, 11);
});

test("getISOWeek handles year boundary (week 1 of new year)", () => {
  // 2025-01-06 is a Monday in week 2 of 2025
  const { year, week } = getISOWeek(new Date(2025, 0, 6));
  assert.equal(year, 2025);
  assert.equal(week, 2);
});

test("getISOWeek handles ISO year that differs from calendar year", () => {
  // 2024-12-30 is a Monday and belongs to ISO week 1 of 2025
  const { year, week } = getISOWeek(new Date(2024, 11, 30));
  assert.equal(year, 2025);
  assert.equal(week, 1);
});

// ---------------------------------------------------------------------------
// isDateInWeek
// ---------------------------------------------------------------------------

test("isDateInWeek returns true when date is in the given week", () => {
  assert.equal(isDateInWeek("2026-03-11", { year: 2026, week: 11 }), true);
});

test("isDateInWeek returns false when date is in a different week", () => {
  assert.equal(isDateInWeek("2026-03-16", { year: 2026, week: 11 }), false);
});

test("isDateInWeek returns false when year differs", () => {
  assert.equal(isDateInWeek("2025-03-11", { year: 2026, week: 11 }), false);
});

// ---------------------------------------------------------------------------
// prevPeriodDate
// ---------------------------------------------------------------------------

test("prevPeriodDate subtracts 1 day for Day period", () => {
  const d = new Date(2026, 2, 15); // Mar 15
  const prev = prevPeriodDate(d, 'day');
  assert.equal(prev.getDate(), 14);
  assert.equal(prev.getMonth(), 2);
});

test("prevPeriodDate subtracts 7 days for Week period", () => {
  const d = new Date(2026, 2, 16); // Mar 16 (week 12)
  const prev = prevPeriodDate(d, 'week');
  assert.equal(prev.getDate(), 9); // Mar 9 (week 11)
});

test("prevPeriodDate subtracts 1 month for Month period", () => {
  const d = new Date(2026, 2, 1); // Mar 2026
  const prev = prevPeriodDate(d, 'month');
  assert.equal(prev.getMonth(), 1); // Feb
  assert.equal(prev.getFullYear(), 2026);
});

test("prevPeriodDate does not mutate the input", () => {
  const d = new Date(2026, 2, 15);
  const original = d.getTime();
  prevPeriodDate(d, 'day');
  assert.equal(d.getTime(), original);
});

// ---------------------------------------------------------------------------
// computeStreak
// ---------------------------------------------------------------------------

test("computeStreak returns zero streak and null openSince for no history", () => {
  const map = new Map<string, boolean>();
  // Habit created in week 12, referenceDate is also week 12
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 2, 16), // created week 12
    'week',
  );
  assert.equal(result.currentStrikeLength, 0);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak returns streak of 1 when previous week succeeded", () => {
  const map = new Map<string, boolean>([["2026-W11", true]]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 2, 9),  // created week 11
    'week',
  );
  assert.equal(result.currentStrikeLength, 1);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak counts consecutive succeeded weeks", () => {
  const map = new Map<string, boolean>([
    ["2026-W09", true],
    ["2026-W10", true],
    ["2026-W11", true],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 1, 23), // created week 9
    'week',
  );
  assert.equal(result.currentStrikeLength, 3);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak stops counting at a failed week", () => {
  const map = new Map<string, boolean>([
    ["2026-W09", true],
    ["2026-W10", false],
    ["2026-W11", true],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 1, 23), // created week 9
    'week',
  );
  // Streak starts from week 11 (most recent), stops at week 10 (failed)
  assert.equal(result.currentStrikeLength, 1);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak sets openSincePeriodKey when current run is all failures", () => {
  const map = new Map<string, boolean>([
    ["2026-W09", true],
    ["2026-W10", false],
    ["2026-W11", false],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 1, 23), // created week 9
    'week',
  );
  assert.equal(result.currentStrikeLength, 0);
  // Open since week 10 — the earliest failing week in the run
  assert.equal(result.openSincePeriodKey, "2026-W10");
});

test("computeStreak treats missing period docs as failed", () => {
  // No week 11 doc → treated as not succeeded
  const map = new Map<string, boolean>([["2026-W10", true]]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 1, 23), // created week 9
    'week',
  );
  // Week 11 missing → failed → streak from week 11 onward breaks
  assert.equal(result.currentStrikeLength, 0);
  assert.equal(result.openSincePeriodKey, "2026-W11");
});

test("computeStreak does not count periods before createdAt", () => {
  const map = new Map<string, boolean>([
    ["2026-W10", true],
    ["2026-W11", true],
  ]);
  // Created in week 11, so week 10 is before the habit existed
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 2, 9),  // created week 11
    'week',
  );
  assert.equal(result.currentStrikeLength, 1); // only week 11 counts
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak works for Day period", () => {
  const map = new Map<string, boolean>([
    ["2026-03-13", true],
    ["2026-03-14", true],
    ["2026-03-15", false],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // Mar 16 reference
    new Date(2026, 2, 10), // created Mar 10
    'day',
  );
  assert.equal(result.currentStrikeLength, 0);
  // Mar 15 is the only failing day before the success run — open since Mar 15
  assert.equal(result.openSincePeriodKey, "2026-03-15");
});

test("computeStreak works for Month period", () => {
  const map = new Map<string, boolean>([
    ["2026-01", true],
    ["2026-02", true],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 1), // March reference
    new Date(2026, 0, 1), // created January
    'month',
  );
  assert.equal(result.currentStrikeLength, 2);
  assert.equal(result.openSincePeriodKey, null);
});
