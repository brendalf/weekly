import test from "node:test";
import assert from "node:assert/strict";

import {
  buildActivityFeed,
  formatHabitMarkDetail,
  isHabitMarkActivity,
} from "./activity";
import { Period } from "../models/habit";
import type { ActivityNotification } from "../models/workspace";

function mark(
  overrides: Partial<ActivityNotification> & { id: string },
): ActivityNotification {
  return {
    workspaceId: "ws1",
    type: "habit_progress",
    actorUid: "u1",
    actorDisplayName: "Ana",
    itemId: "h1",
    itemName: "Gym",
    habitPeriod: Period.WEEK,
    periodKey: "2026-W11",
    progressTarget: 3,
    createdAt: "2026-03-11T10:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isHabitMarkActivity
// ---------------------------------------------------------------------------

test("isHabitMarkActivity covers both habit mark types", () => {
  assert.equal(isHabitMarkActivity("habit_completed"), true);
  assert.equal(isHabitMarkActivity("habit_progress"), true);
  assert.equal(isHabitMarkActivity("habit_added"), false);
  assert.equal(isHabitMarkActivity("comment_added"), false);
});

// ---------------------------------------------------------------------------
// buildActivityFeed
// ---------------------------------------------------------------------------

test("buildActivityFeed keeps non-habit activities untouched and in order", () => {
  const feed = buildActivityFeed([
    mark({ id: "a", type: "note_added", habitPeriod: undefined, periodKey: undefined }),
    mark({ id: "b", type: "comment_added", habitPeriod: undefined, periodKey: undefined }),
  ]);

  assert.deepEqual(
    feed.map((e) => e.key),
    ["a", "b"],
  );
  assert.deepEqual(
    feed.map((e) => e.dayKeys),
    [[], []],
  );
});

test("buildActivityFeed merges marks of the same habit period into one entry", () => {
  const feed = buildActivityFeed([
    mark({
      id: "c",
      dayKey: "2026-03-13",
      progressCount: 3,
      type: "habit_completed",
      createdAt: "2026-03-13T08:00:00.000Z",
    }),
    mark({ id: "b", dayKey: "2026-03-11", progressCount: 2 }),
    mark({ id: "a", dayKey: "2026-03-09", progressCount: 1 }),
  ]);

  assert.equal(feed.length, 1);
  const [entry] = feed;
  assert.equal(entry.key, "u1|h1|2026-W11");
  assert.equal(entry.activity.type, "habit_completed");
  assert.equal(entry.activity.progressCount, 3);
  // Newest mark supplies the timestamp, every marked day is listed oldest-first.
  assert.equal(entry.activity.createdAt, "2026-03-13T08:00:00.000Z");
  assert.deepEqual(entry.dayKeys, ["2026-03-09", "2026-03-11", "2026-03-13"]);
});

test("buildActivityFeed promotes a merged entry to completed and dedupes days", () => {
  const feed = buildActivityFeed([
    mark({ id: "b", dayKey: "2026-03-09", progressCount: 2 }),
    mark({
      id: "a",
      dayKey: "2026-03-09",
      progressCount: 3,
      type: "habit_completed",
    }),
  ]);

  assert.equal(feed.length, 1);
  assert.equal(feed[0].activity.type, "habit_completed");
  assert.equal(feed[0].activity.progressCount, 3);
  assert.deepEqual(feed[0].dayKeys, ["2026-03-09"]);
});

test("buildActivityFeed keeps different habits, actors and periods apart", () => {
  const feed = buildActivityFeed([
    mark({ id: "a", dayKey: "2026-03-09" }),
    mark({ id: "b", dayKey: "2026-03-09", itemId: "h2" }),
    mark({ id: "c", dayKey: "2026-03-09", actorUid: "u2" }),
    mark({ id: "d", dayKey: "2026-03-02", periodKey: "2026-W10" }),
  ]);

  assert.equal(feed.length, 4);
});

test("buildActivityFeed does not group legacy marks that carry no period", () => {
  const feed = buildActivityFeed([
    mark({ id: "a", type: "habit_completed", habitPeriod: undefined, periodKey: undefined }),
    mark({ id: "b", type: "habit_completed", habitPeriod: undefined, periodKey: undefined }),
  ]);

  assert.deepEqual(
    feed.map((e) => e.key),
    ["a", "b"],
  );
});

// ---------------------------------------------------------------------------
// formatHabitMarkDetail
// ---------------------------------------------------------------------------

test("formatHabitMarkDetail describes period, progress and marked days", () => {
  const [entry] = buildActivityFeed([
    mark({ id: "b", dayKey: "2026-03-11", progressCount: 2 }),
    mark({ id: "a", dayKey: "2026-03-09", progressCount: 1 }),
  ]);

  assert.equal(
    formatHabitMarkDetail(entry),
    "Week 11 · 2/3 · marked Mon 9, Wed 11",
  );
});

test("formatHabitMarkDetail spells out a single marked day", () => {
  const [entry] = buildActivityFeed([
    mark({ id: "a", dayKey: "2026-03-09", progressCount: 1 }),
  ]);

  assert.equal(formatHabitMarkDetail(entry), "Week 11 · 1/3 · marked Mon, Mar 9");
});

test("formatHabitMarkDetail omits the fraction for single-target habits", () => {
  const [entry] = buildActivityFeed([
    mark({
      id: "a",
      dayKey: "2026-03-09",
      progressCount: 1,
      progressTarget: 1,
      type: "habit_completed",
      habitPeriod: Period.MONTH,
      periodKey: "2026-03",
    }),
  ]);

  assert.equal(formatHabitMarkDetail(entry), "Mar 2026 · marked Mon, Mar 9");
});

test("formatHabitMarkDetail reduces a day habit to its day and progress", () => {
  const [entry] = buildActivityFeed([
    mark({
      id: "a",
      dayKey: "2026-03-09",
      progressCount: 1,
      progressTarget: 2,
      habitPeriod: Period.DAY,
      periodKey: "2026-03-09",
    }),
  ]);

  assert.equal(formatHabitMarkDetail(entry), "Mon, Mar 9 · 1/2");
});

test("formatHabitMarkDetail returns null for legacy marks without a period", () => {
  const [entry] = buildActivityFeed([
    mark({ id: "a", type: "habit_completed", habitPeriod: undefined, periodKey: undefined }),
  ]);

  assert.equal(formatHabitMarkDetail(entry), null);
});
