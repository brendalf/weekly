import test from "node:test";
import assert from "node:assert/strict";

import { Period } from "../models/habit";
import type { Habit } from "../models/habit";
import type { HabitWeekReview } from "./review";
import {
  compareHabitReviews,
  habitWeekPeriods,
  habitWeekProgressLabel,
  reviewHabitWeek,
  summarizeHabitWeek,
} from "./review";

// Mon 2026-03-09 … Sun 2026-03-15 (ISO week 11).
const WEEK_START = new Date(2026, 2, 9);
/** A clock well after the week under review: everything in it has settled. */
const AFTER = new Date(2026, 2, 20);

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Read",
    times: 1,
    period: Period.DAY,
    createdAt: new Date(2026, 0, 1).toISOString(),
    ...overrides,
  };
}

const noMarks = new Map<string, number>();

// ---------------------------------------------------------------------------
// habitWeekPeriods
// ---------------------------------------------------------------------------

test("a daily habit is asked once per day of the week", () => {
  const periods = habitWeekPeriods(habit(), WEEK_START);
  assert.equal(periods.length, 7);
  assert.equal(periods[0].key, "2026-03-09");
  assert.equal(periods[6].key, "2026-03-15");
});

test("a daily habit is only asked on its active days", () => {
  // Mon, Wed, Fri.
  const periods = habitWeekPeriods(habit({ activeDays: [1, 3, 5] }), WEEK_START);
  assert.deepEqual(
    periods.map((p) => p.key),
    ["2026-03-09", "2026-03-11", "2026-03-13"],
  );
});

test("a habit created mid-week is not asked for the days before it existed", () => {
  const periods = habitWeekPeriods(
    habit({ createdAt: new Date(2026, 2, 12).toISOString() }),
    WEEK_START,
  );
  assert.deepEqual(
    periods.map((p) => p.key),
    ["2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"],
  );
});

test("a weekly habit is asked once, for the week's key", () => {
  const periods = habitWeekPeriods(habit({ period: Period.WEEK }), WEEK_START);
  assert.deepEqual(
    periods.map((p) => p.key),
    ["2026-W11"],
  );
});

test("a monthly habit is asked once, for the month the ISO week belongs to", () => {
  // Mon 2026-03-30 … Sun 2026-04-05 straddles two months; its Thursday is in
  // April, so the week belongs to April and the habit is asked once.
  const periods = habitWeekPeriods(
    habit({ period: Period.MONTH }),
    new Date(2026, 2, 30),
  );
  assert.deepEqual(
    periods.map((p) => p.key),
    ["2026-04"],
  );
});

test("a habit that did not exist yet is asked for nothing", () => {
  const periods = habitWeekPeriods(
    habit({ period: Period.WEEK, createdAt: new Date(2026, 5, 1).toISOString() }),
    WEEK_START,
  );
  assert.deepEqual(periods, []);
});

test("a skipped period is listed, flagged, not dropped", () => {
  const periods = habitWeekPeriods(
    habit({ skippedPeriods: ["2026-03-10"] }),
    WEEK_START,
  );
  assert.equal(periods.length, 7);
  assert.deepEqual(
    periods.filter((p) => p.skipped).map((p) => p.key),
    ["2026-03-10"],
  );
});

// ---------------------------------------------------------------------------
// reviewHabitWeek
// ---------------------------------------------------------------------------

test("a daily habit met every day holds its streak at 100%", () => {
  const marks = new Map(
    habitWeekPeriods(habit(), WEEK_START).map((p) => [p.key, 1] as const),
  );
  const review = reviewHabitWeek(habit(), WEEK_START, AFTER, marks);

  assert.equal(review.committed, 7);
  assert.equal(review.succeeded, 7);
  assert.equal(review.missed, 0);
  assert.equal(review.completionRate, 1);
  assert.equal(review.streak, "held");
});

test("one missed day breaks the streak and lowers the rate", () => {
  const marks = new Map([
    ["2026-03-09", 1],
    ["2026-03-10", 1],
    ["2026-03-11", 1],
    ["2026-03-12", 1],
    ["2026-03-13", 1],
    ["2026-03-14", 1],
  ]);
  const review = reviewHabitWeek(habit(), WEEK_START, AFTER, marks);

  assert.equal(review.succeeded, 6);
  assert.equal(review.missed, 1);
  assert.equal(review.completionRate, 6 / 7);
  assert.equal(review.streak, "broken");
});

test("a skipped day leaves the denominator instead of counting as a miss", () => {
  const skipped = habit({ skippedPeriods: ["2026-03-15"] });
  const marks = new Map(
    ["09", "10", "11", "12", "13", "14"].map(
      (d) => [`2026-03-${d}`, 1] as const,
    ),
  );
  const review = reviewHabitWeek(skipped, WEEK_START, AFTER, marks);

  assert.equal(review.committed, 6);
  assert.equal(review.skipped, 1);
  assert.equal(review.missed, 0);
  assert.equal(review.completionRate, 1);
  assert.equal(review.streak, "held");
});

test("a day that has not happened yet is pending, not missed", () => {
  // Reviewing the running week on Wednesday: Mon and Tue have settled.
  const wednesday = new Date(2026, 2, 11, 10, 0, 0);
  const marks = new Map([
    ["2026-03-09", 1],
    ["2026-03-10", 1],
  ]);
  const review = reviewHabitWeek(habit(), WEEK_START, wednesday, marks);

  assert.equal(review.succeeded, 2);
  assert.equal(review.missed, 0);
  assert.equal(review.pending, 5, "Wednesday through Sunday are still open");
  assert.equal(review.completionRate, 1);
  assert.equal(review.streak, "held");
});

test("the current week of a weekly habit is open, never broken", () => {
  const weekly = habit({ period: Period.WEEK, times: 3 });
  const review = reviewHabitWeek(
    weekly,
    WEEK_START,
    new Date(2026, 2, 11),
    new Map([["2026-W11", 1]]),
  );

  assert.equal(review.pending, 1);
  assert.equal(review.missed, 0);
  assert.equal(review.completionRate, null);
  assert.equal(review.streak, "open");
  assert.equal(review.marks, 1);
  assert.equal(review.marksTarget, 3);
});

test("partial marks on a finished period still count as a miss", () => {
  const weekly = habit({ period: Period.WEEK, times: 3 });
  const review = reviewHabitWeek(
    weekly,
    WEEK_START,
    AFTER,
    new Map([["2026-W11", 2]]),
  );

  assert.equal(review.marks, 2);
  assert.equal(review.succeeded, 0);
  assert.equal(review.missed, 1);
  assert.equal(review.completionRate, 0);
  assert.equal(review.streak, "broken");
});

test("marks beyond the target do not inflate the count", () => {
  const weekly = habit({ period: Period.WEEK, times: 2 });
  const review = reviewHabitWeek(
    weekly,
    WEEK_START,
    AFTER,
    new Map([["2026-W11", 9]]),
  );

  assert.equal(review.marks, 2);
  assert.equal(review.marksTarget, 2);
});

test("a habit the week asked nothing of scores nothing", () => {
  const future = habit({
    period: Period.WEEK,
    createdAt: new Date(2026, 5, 1).toISOString(),
  });
  const review = reviewHabitWeek(future, WEEK_START, AFTER, noMarks);

  assert.equal(review.committed, 0);
  assert.equal(review.completionRate, null);
  assert.equal(review.streak, "open");
});

// ---------------------------------------------------------------------------
// summarizeHabitWeek
// ---------------------------------------------------------------------------

test("the summary counts periods, not habits, for the rate", () => {
  const daily = habit({ id: "a", name: "Walk" });
  const weekly = habit({ id: "b", name: "Plan", period: Period.WEEK });

  const dailyMarks = new Map([
    ["2026-03-09", 1],
    ["2026-03-10", 1],
    ["2026-03-11", 1],
    ["2026-03-12", 1],
    ["2026-03-13", 1],
    ["2026-03-14", 1],
    ["2026-03-15", 1],
  ]);

  const summary = summarizeHabitWeek([
    reviewHabitWeek(daily, WEEK_START, AFTER, dailyMarks),
    reviewHabitWeek(weekly, WEEK_START, AFTER, noMarks),
  ]);

  assert.equal(summary.committedHabits, 2);
  assert.equal(summary.succeeded, 7);
  assert.equal(summary.missed, 1);
  assert.equal(summary.completionRate, 7 / 8);
  assert.equal(summary.streaksHeld, 1);
  assert.equal(summary.streaksBroken, 1);
});

test("a week with nothing settled reports no rate rather than zero", () => {
  const weekly = habit({ period: Period.WEEK });
  const summary = summarizeHabitWeek([
    reviewHabitWeek(weekly, WEEK_START, new Date(2026, 2, 10), noMarks),
  ]);

  assert.equal(summary.completionRate, null);
  assert.equal(summary.pending, 1);
  assert.equal(summary.streaksHeld, 0);
  assert.equal(summary.streaksBroken, 0);
});

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

test("the recap leads with what broke", () => {
  const base = reviewHabitWeek(habit(), WEEK_START, AFTER, noMarks);
  const rows: HabitWeekReview[] = [
    { ...base, name: "Held", streak: "held" },
    { ...base, name: "Open", streak: "open" },
    { ...base, name: "Broken", streak: "broken" },
    { ...base, name: "Also held", streak: "held" },
  ];

  assert.deepEqual(
    [...rows].sort(compareHabitReviews).map((r) => r.name),
    ["Broken", "Open", "Also held", "Held"],
  );
});

test("the progress label counts days for daily habits and marks otherwise", () => {
  const daily = reviewHabitWeek(
    habit({ activeDays: [1, 3, 5] }),
    WEEK_START,
    AFTER,
    new Map([["2026-03-09", 1]]),
  );
  assert.equal(habitWeekProgressLabel(daily), "1/3 days");

  const weekly = reviewHabitWeek(
    habit({ period: Period.WEEK, times: 3 }),
    WEEK_START,
    AFTER,
    new Map([["2026-W11", 2]]),
  );
  assert.equal(habitWeekProgressLabel(weekly), "2/3 marks this week");

  const monthly = reviewHabitWeek(
    habit({ period: Period.MONTH, times: 1 }),
    WEEK_START,
    AFTER,
    noMarks,
  );
  assert.equal(habitWeekProgressLabel(monthly), "0/1 mark this month");
});
