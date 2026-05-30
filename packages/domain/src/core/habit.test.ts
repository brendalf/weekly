import test from "node:test";
import assert from "node:assert/strict";

import {
  computeStreak,
  filterHabitsByDay,
  getActiveSkipKey,
  getISOWeek,
  getSkipPeriodKeys,
  isDateInWeek,
  isHabitSkipped,
  isHabitSucceeded,
  prevPeriodDate,
} from "./habit";
import type { Habit } from "../models/habit";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Test",
    times: 1,
    period: "day",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

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

test("computeStreak skips inactive days (Mon-Fri habit completed Friday, reference Monday)", () => {
  // Friday 2026-03-27 was completed. Saturday/Sunday are not active days.
  // Reference is Monday 2026-03-30. Streak should be 1, openSince null.
  const map = new Map<string, boolean>([
    ["2026-03-27", true], // Friday — completed
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 30), // Monday Mar 30 reference
    new Date(2026, 2, 23), // created Mon Mar 23
    'day',
    undefined,
    [1, 2, 3, 4, 5], // Mon-Fri active days
  );
  assert.equal(result.currentStrikeLength, 1);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak with activeDays: openSince lands on last active day, not weekend", () => {
  // Mon-Fri habit, nothing completed. Reference Monday 2026-03-30.
  // Should report openSince as last Friday (2026-03-27), not Saturday/Sunday.
  const map = new Map<string, boolean>();
  const result = computeStreak(
    map,
    new Date(2026, 2, 30), // Monday Mar 30 reference
    new Date(2026, 2, 23), // created Mon Mar 23
    'day',
    undefined,
    [1, 2, 3, 4, 5],
  );
  assert.equal(result.currentStrikeLength, 0);
  assert.equal(result.openSincePeriodKey, "2026-03-23"); // earliest active day in failing run
});

test("computeStreak with activeDays: streak spans multiple weeks across weekends", () => {
  // Mon-Fri habit completed every active day for two weeks.
  // Reference Monday 2026-03-30, weekends should be transparent.
  const map = new Map<string, boolean>([
    ["2026-03-16", true], ["2026-03-17", true], ["2026-03-18", true], ["2026-03-19", true], ["2026-03-20", true], // prev-prev week Mon-Fri
    ["2026-03-23", true], ["2026-03-24", true], ["2026-03-25", true], ["2026-03-26", true], ["2026-03-27", true], // prev week Mon-Fri
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 30), // Monday Mar 30 reference
    new Date(2026, 2, 16), // created Mon Mar 16
    'day',
    undefined,
    [1, 2, 3, 4, 5],
  );
  assert.equal(result.currentStrikeLength, 10);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak with activeDays: missed last Friday sets openSince to that Friday", () => {
  // Mon-Fri habit. Last Friday was missed. Reference Monday 2026-03-30.
  // openSince should be Friday 2026-03-27, not Saturday/Sunday.
  const map = new Map<string, boolean>([
    ["2026-03-23", true], ["2026-03-24", true], ["2026-03-25", true], ["2026-03-26", true], // Mon-Thu completed
    // 2026-03-27 (Friday) missing → failed
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 30), // Monday Mar 30 reference
    new Date(2026, 2, 23), // created Mon Mar 23
    'day',
    undefined,
    [1, 2, 3, 4, 5],
  );
  assert.equal(result.currentStrikeLength, 0);
  assert.equal(result.openSincePeriodKey, "2026-03-27");
});

test("computeStreak: week key skip makes that week transparent in streak", () => {
  const map = new Map<string, boolean>([
    ["2026-W09", true],
    // W10 has a week key in skippedPeriods → should be skipped, not count as failure
    ["2026-W11", true],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 1, 23), // created week 9
    'week',
    ["2026-W10"],
  );
  assert.equal(result.currentStrikeLength, 2); // W9 + W11 both succeeded, W10 skipped
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak: month key skip makes all weeks in that month transparent", () => {
  // W10 (Mar 2-8) and W11 (Mar 9-15) succeeded. February is skipped.
  // W5 (Jan 26) is not in the map → failure. Streak should be 2 (W10 + W11).
  const map = new Map<string, boolean>([
    ["2026-W10", true],
    ["2026-W11", true],
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference (Mar 16)
    new Date(2026, 0, 19), // created week 4 (Jan 19)
    'week',
    ["2026-02"], // skip all of February
  );
  // W11 succeeded, W10 succeeded, Feb weeks (W6-W9) skipped, W5 fails → streak = 2
  assert.equal(result.currentStrikeLength, 2);
  assert.equal(result.openSincePeriodKey, null);
});

test("computeStreak: day key skip does NOT make the whole week transparent (UI-only)", () => {
  const map = new Map<string, boolean>([
    ["2026-W09", true],
    // W10 missing (failure) — a day key skip should not save it
  ]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12
    new Date(2026, 1, 23), // created week 9
    'week',
    ["2026-03-09"], // skip Monday of W10 only — day key, should NOT affect streak
  );
  assert.equal(result.currentStrikeLength, 0); // W10 still a failure
  assert.equal(result.openSincePeriodKey, "2026-W10");
});

test("computeStreak activeDays is ignored for non-Day periods", () => {
  // activeDays only applies to Day period; for Week it should have no effect.
  const map = new Map<string, boolean>([["2026-W11", true]]);
  const result = computeStreak(
    map,
    new Date(2026, 2, 16), // week 12 reference
    new Date(2026, 2, 9),  // created week 11
    'week',
    undefined,
    [1, 2, 3, 4, 5], // should be ignored
  );
  assert.equal(result.currentStrikeLength, 1);
  assert.equal(result.openSincePeriodKey, null);
});

// ---------------------------------------------------------------------------
// filterHabitsByDay
// ---------------------------------------------------------------------------

test("filterHabitsByDay includes habit with no activeDays restriction", () => {
  const habit = makeHabit(); // no activeDays
  const result = filterHabitsByDay([habit], new Date(2026, 2, 28)); // Saturday
  assert.equal(result.length, 1);
});

test("filterHabitsByDay includes habit when day is in activeDays", () => {
  const habit = makeHabit({ activeDays: [1, 2, 3, 4, 5] }); // Mon-Fri
  const monday = new Date(2026, 2, 30); // Monday
  const result = filterHabitsByDay([habit], monday);
  assert.equal(result.length, 1);
});

test("filterHabitsByDay excludes habit when day is not in activeDays", () => {
  const habit = makeHabit({ activeDays: [1, 2, 3, 4, 5] }); // Mon-Fri
  const saturday = new Date(2026, 2, 28); // Saturday
  const result = filterHabitsByDay([habit], saturday);
  assert.equal(result.length, 0);
});

test("filterHabitsByDay excludes habit created after the selected day", () => {
  const habit = makeHabit({ createdAt: "2026-03-31T00:00:00.000Z" });
  const result = filterHabitsByDay([habit], new Date(2026, 2, 30)); // day before creation
  assert.equal(result.length, 0);
});

test("filterHabitsByDay includes habit created on the selected day", () => {
  const habit = makeHabit({ createdAt: "2026-03-30T00:00:00.000Z" });
  const result = filterHabitsByDay([habit], new Date(2026, 2, 30));
  assert.equal(result.length, 1);
});

test("filterHabitsByDay filters independently per habit", () => {
  const monFri = makeHabit({ id: "h1", activeDays: [1, 2, 3, 4, 5] });
  const everyday = makeHabit({ id: "h2" });
  const saturday = new Date(2026, 2, 28);
  const result = filterHabitsByDay([monFri, everyday], saturday);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "h2");
});

// ---------------------------------------------------------------------------
// isHabitSkipped
// ---------------------------------------------------------------------------

test("isHabitSkipped returns false when skippedPeriods is undefined", () => {
  const habit = makeHabit();
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 30)), false);
});

test("isHabitSkipped returns false when skippedPeriods is empty", () => {
  const habit = makeHabit({ skippedPeriods: [] });
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 30)), false);
});

test("isHabitSkipped returns true when day key is in skippedPeriods", () => {
  const habit = makeHabit({ period: "day", skippedPeriods: ["2026-03-30"] });
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 30)), true);
});

test("isHabitSkipped returns false when day key is not in skippedPeriods", () => {
  const habit = makeHabit({ period: "day", skippedPeriods: ["2026-03-29"] });
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 30)), false);
});

test("isHabitSkipped returns true when week key is in skippedPeriods (week-period habit)", () => {
  const habit = makeHabit({ period: "week", skippedPeriods: ["2026-W13"] });
  // 2026-03-30 is week 14, not week 13
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 30)), false);
  // 2026-03-23 is week 13
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 23)), true);
});

test("isHabitSkipped returns true when day key is in skippedPeriods (week-period habit)", () => {
  // 'skip today' stores a day key regardless of habit period
  const habit = makeHabit({ period: "week", skippedPeriods: ["2026-03-30"] });
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 30)), true);
  // Other days in the same week are NOT skipped
  assert.equal(isHabitSkipped(habit, new Date(2026, 2, 31)), false);
});

test("isHabitSkipped returns true when month key is in skippedPeriods (any period)", () => {
  const weekHabit = makeHabit({ period: "week", skippedPeriods: ["2026-03"] });
  assert.equal(isHabitSkipped(weekHabit, new Date(2026, 2, 15)), true);
  assert.equal(isHabitSkipped(weekHabit, new Date(2026, 3, 1)), false); // April not skipped

  const dayHabit = makeHabit({ period: "day", skippedPeriods: ["2026-03"] });
  assert.equal(isHabitSkipped(dayHabit, new Date(2026, 2, 1)), true);
  assert.equal(isHabitSkipped(dayHabit, new Date(2026, 2, 31)), true);
  assert.equal(isHabitSkipped(dayHabit, new Date(2026, 3, 1)), false);
});

// ---------------------------------------------------------------------------
// getSkipPeriodKeys
// ---------------------------------------------------------------------------

test("getSkipPeriodKeys 'today' always returns the day key (regardless of habit period)", () => {
  // Day habit
  assert.deepEqual(getSkipPeriodKeys(new Date(2026, 2, 30), 'today'), ["2026-03-30"]);
  // Week habit — same result: day key, not week key
  assert.deepEqual(getSkipPeriodKeys(new Date(2026, 2, 30), 'today'), ["2026-03-30"]);
});

test("getSkipPeriodKeys 'week' returns the week key", () => {
  assert.deepEqual(getSkipPeriodKeys(new Date(2026, 2, 30), 'week'), ["2026-W14"]);
});

test("getSkipPeriodKeys 'month' returns the month key", () => {
  assert.deepEqual(getSkipPeriodKeys(new Date(2026, 2, 30), 'month'), ["2026-03"]);
});

test("getSkipPeriodKeys 'until' with no period (defaults to DAY) returns day keys", () => {
  const keys = getSkipPeriodKeys(
    new Date(2026, 2, 30),
    'until',
    new Date(2026, 3, 1), // until Apr 1
  );
  assert.deepEqual(keys, ["2026-03-30", "2026-03-31", "2026-04-01"]);
});

test("getSkipPeriodKeys 'until' with DAY period returns day keys from start to untilDate inclusive", () => {
  const keys = getSkipPeriodKeys(
    new Date(2026, 2, 30),
    'until',
    new Date(2026, 3, 1),
    'day',
  );
  assert.deepEqual(keys, ["2026-03-30", "2026-03-31", "2026-04-01"]);
});

test("getSkipPeriodKeys 'until' with WEEK period returns distinct week keys in range", () => {
  const keys = getSkipPeriodKeys(
    new Date(2026, 2, 30), // week 14
    'until',
    new Date(2026, 3, 13), // week 16
    'week',
  );
  assert.deepEqual(keys, ["2026-W14", "2026-W15", "2026-W16"]);
});

test("getSkipPeriodKeys 'until' with MONTH period returns distinct month keys in range", () => {
  const keys = getSkipPeriodKeys(
    new Date(2026, 2, 1), // March
    'until',
    new Date(2026, 4, 15), // May
    'month',
  );
  assert.deepEqual(keys, ["2026-03", "2026-04", "2026-05"]);
});

// ---------------------------------------------------------------------------
// getActiveSkipKey
// ---------------------------------------------------------------------------

test("getActiveSkipKey returns null for empty skippedPeriods", () => {
  assert.equal(getActiveSkipKey([], new Date(2026, 2, 30)), null);
});

test("getActiveSkipKey returns day key when day key is present (most specific)", () => {
  const key = getActiveSkipKey(["2026-03-30", "2026-W14", "2026-03"], new Date(2026, 2, 30));
  assert.equal(key, "2026-03-30");
});

test("getActiveSkipKey returns week key when only week key is present", () => {
  const key = getActiveSkipKey(["2026-W14"], new Date(2026, 2, 30));
  assert.equal(key, "2026-W14");
});

test("getActiveSkipKey returns month key when only month key is present", () => {
  const key = getActiveSkipKey(["2026-03"], new Date(2026, 2, 30));
  assert.equal(key, "2026-03");
});

test("getActiveSkipKey returns null when no key covers the given day", () => {
  const key = getActiveSkipKey(["2026-03-29", "2026-W13", "2026-02"], new Date(2026, 2, 30));
  assert.equal(key, null);
});
