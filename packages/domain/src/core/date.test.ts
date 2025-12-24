import test from "node:test";
import assert from "node:assert/strict";

import { addDays, getStartOfWeek, getWeekDays } from "./date";

test("getStartOfWeek returns Monday at 00:00:00.000", () => {
  const input = new Date("2025-12-24T15:30:00.000Z"); // Wednesday
  const start = getStartOfWeek(input);

  // ISO string will be in UTC; our logic uses local time but sets time to 00:00.
  // So we assert the structural properties rather than an exact ISO string.
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getSeconds(), 0);
  assert.equal(start.getMilliseconds(), 0);

  // JS getDay(): 1 is Monday
  assert.equal(start.getDay(), 1);
});

test("addDays does not mutate input date", () => {
  const d1 = new Date("2025-12-24T00:00:00.000Z");
  const d2 = addDays(d1, 7);

  assert.notEqual(d1.getTime(), d2.getTime());
  assert.equal(d1.toISOString(), "2025-12-24T00:00:00.000Z");
  assert.equal(d2.toISOString(), "2025-12-31T00:00:00.000Z");
});

test("getWeekDays returns 7 consecutive days", () => {
  const start = new Date("2025-12-22T00:00:00.000Z"); // Monday
  const days = getWeekDays(start);

  assert.equal(days.length, 7);
  assert.equal(days[0].toISOString(), "2025-12-22T00:00:00.000Z");
  assert.equal(days[6].toISOString(), "2025-12-28T00:00:00.000Z");
});
