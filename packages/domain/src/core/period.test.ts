import test from "node:test";
import assert from "node:assert/strict";

import { HabitPeriod } from "../models/habit";
import { dayKeyOf, monthKeyOf, periodKeyOf, weekKeyOf } from "./period";

// ---------------------------------------------------------------------------
// dayKeyOf
// ---------------------------------------------------------------------------

test("dayKeyOf formats date as YYYY-MM-DD", () => {
  assert.equal(dayKeyOf(new Date(2026, 2, 9)), "2026-03-09");
});

test("dayKeyOf zero-pads month and day", () => {
  assert.equal(dayKeyOf(new Date(2026, 0, 1)), "2026-01-01");
});

test("dayKeyOf handles end of year", () => {
  assert.equal(dayKeyOf(new Date(2025, 11, 31)), "2025-12-31");
});

// ---------------------------------------------------------------------------
// weekKeyOf
// ---------------------------------------------------------------------------

test("weekKeyOf returns YYYY-W## for a known week", () => {
  // 2026-03-09 is Monday of week 11
  assert.equal(weekKeyOf(new Date(2026, 2, 9)), "2026-W11");
});

test("weekKeyOf zero-pads single-digit weeks", () => {
  // 2026-01-05 is a Monday in week 2
  assert.equal(weekKeyOf(new Date(2026, 0, 5)), "2026-W02");
});

test("weekKeyOf assigns ISO year for cross-year week", () => {
  // 2024-12-30 belongs to ISO week 1 of 2025
  assert.equal(weekKeyOf(new Date(2024, 11, 30)), "2025-W01");
});

test("weekKeyOf is consistent for all days in the same week", () => {
  // Week 11 of 2026: Mon Mar 9 – Sun Mar 15
  const expected = "2026-W11";
  for (let d = 9; d <= 15; d++) {
    assert.equal(weekKeyOf(new Date(2026, 2, d)), expected, `failed for Mar ${d}`);
  }
});

// ---------------------------------------------------------------------------
// monthKeyOf
// ---------------------------------------------------------------------------

test("monthKeyOf formats date as YYYY-MM", () => {
  assert.equal(monthKeyOf(new Date(2026, 2, 15)), "2026-03");
});

test("monthKeyOf zero-pads single-digit months", () => {
  assert.equal(monthKeyOf(new Date(2026, 0, 31)), "2026-01");
});

// ---------------------------------------------------------------------------
// periodKeyOf
// ---------------------------------------------------------------------------

test("periodKeyOf delegates to dayKeyOf for Day period", () => {
  const d = new Date(2026, 2, 15);
  assert.equal(periodKeyOf(d, HabitPeriod.Day), dayKeyOf(d));
});

test("periodKeyOf delegates to weekKeyOf for Week period", () => {
  const d = new Date(2026, 2, 15);
  assert.equal(periodKeyOf(d, HabitPeriod.Week), weekKeyOf(d));
});

test("periodKeyOf delegates to monthKeyOf for Month period", () => {
  const d = new Date(2026, 2, 15);
  assert.equal(periodKeyOf(d, HabitPeriod.Month), monthKeyOf(d));
});
