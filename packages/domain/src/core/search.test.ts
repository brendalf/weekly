import test from "node:test";
import assert from "node:assert/strict";

import {
  habitMatchesSearch,
  habitSearchText,
  matchesSearchTokens,
  normalizeSearchText,
  searchTokens,
  taskMatchesSearch,
  taskSearchText,
} from "./search";
import type { Habit } from "../models/habit";
import type { Task } from "../models/task";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Read a book",
    times: 1,
    period: "day",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Pay the electricity bill",
    createdAt: "2026-01-01T00:00:00.000Z",
    completed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeSearchText
// ---------------------------------------------------------------------------

test("normalizeSearchText lowercases and trims", () => {
  assert.equal(normalizeSearchText("  Read A Book  "), "read a book");
});

test("normalizeSearchText strips diacritics", () => {
  assert.equal(normalizeSearchText("Ação Física"), "acao fisica");
});

test("normalizeSearchText collapses inner whitespace", () => {
  assert.equal(normalizeSearchText("read\t  a\nbook"), "read a book");
});

// ---------------------------------------------------------------------------
// searchTokens
// ---------------------------------------------------------------------------

test("searchTokens returns empty array for blank queries", () => {
  assert.deepEqual(searchTokens(""), []);
  assert.deepEqual(searchTokens("   "), []);
});

test("searchTokens splits on whitespace", () => {
  assert.deepEqual(searchTokens("  Read   Book "), ["read", "book"]);
});

// ---------------------------------------------------------------------------
// matchesSearchTokens
// ---------------------------------------------------------------------------

test("matchesSearchTokens matches everything when there are no tokens", () => {
  assert.equal(matchesSearchTokens("anything", []), true);
});

test("matchesSearchTokens requires every token to be present", () => {
  assert.equal(matchesSearchTokens("read a book", ["read", "book"]), true);
  assert.equal(matchesSearchTokens("read a book", ["read", "paper"]), false);
});

test("matchesSearchTokens matches partial words", () => {
  assert.equal(matchesSearchTokens("meditation", ["medit"]), true);
});

// ---------------------------------------------------------------------------
// habit / task matching
// ---------------------------------------------------------------------------

test("habitSearchText includes the time of day when set", () => {
  assert.equal(habitSearchText(makeHabit()), "read a book");
  assert.equal(
    habitSearchText(makeHabit({ timeOfDay: "morning" })),
    "read a book morning",
  );
});

test("habitMatchesSearch matches on name regardless of case and accents", () => {
  const habit = makeHabit({ name: "Correr na Praça" });
  assert.equal(habitMatchesSearch(habit, searchTokens("praca")), true);
  assert.equal(habitMatchesSearch(habit, searchTokens("CORRER")), true);
  assert.equal(habitMatchesSearch(habit, searchTokens("nadar")), false);
});

test("habitMatchesSearch matches on time of day", () => {
  const habit = makeHabit({ timeOfDay: "evening" });
  assert.equal(habitMatchesSearch(habit, searchTokens("evening")), true);
  assert.equal(habitMatchesSearch(habit, searchTokens("morning")), false);
});

test("habitMatchesSearch keeps every habit for a blank query", () => {
  assert.equal(habitMatchesSearch(makeHabit(), searchTokens("  ")), true);
});

test("taskSearchText normalizes the title", () => {
  assert.equal(
    taskSearchText(makeTask({ title: "  Revisar Código  " })),
    "revisar codigo",
  );
});

test("taskMatchesSearch matches tokens in any order", () => {
  const task = makeTask();
  assert.equal(taskMatchesSearch(task, searchTokens("bill electricity")), true);
  assert.equal(taskMatchesSearch(task, searchTokens("bill water")), false);
});
