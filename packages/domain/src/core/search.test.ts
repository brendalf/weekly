import test from "node:test";
import assert from "node:assert/strict";

import {
  habitMatchesSearch,
  habitSearchText,
  matchesSearchTokens,
  noteMatchesSearch,
  noteSearchText,
  normalizeSearchText,
  searchTokens,
  taskMatchesSearch,
  taskSearchText,
} from "./search";
import type { Habit } from "../models/habit";
import type { Note } from "../models/note";
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

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Retro notes",
    body: "Ship the week planner before the offsite.",
    authorId: "u1",
    authorDisplayName: "Ada",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
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

// ---------------------------------------------------------------------------
// note matching (PLAN WS11 — the global filter covers notes too)
// ---------------------------------------------------------------------------

test("noteSearchText joins the title and the body", () => {
  assert.equal(
    noteSearchText(makeNote({ title: "Retro", body: "Ship it" })),
    "retro ship it",
  );
});

test("noteSearchText normalizes case, accents and whitespace", () => {
  assert.equal(
    noteSearchText(makeNote({ title: "  Reunião  ", body: "Pauta\tdo\ndia" })),
    "reuniao pauta do dia",
  );
});

test("noteSearchText handles an empty body without a trailing space", () => {
  assert.equal(noteSearchText(makeNote({ title: "Retro", body: "" })), "retro");
});

test("noteMatchesSearch matches on the title", () => {
  const note = makeNote();
  assert.equal(noteMatchesSearch(note, searchTokens("retro")), true);
  assert.equal(noteMatchesSearch(note, searchTokens("RETRO")), true);
});

test("noteMatchesSearch matches on the body", () => {
  const note = makeNote();
  assert.equal(noteMatchesSearch(note, searchTokens("offsite")), true);
  assert.equal(noteMatchesSearch(note, searchTokens("planner")), true);
});

test("noteMatchesSearch requires every token, across title and body", () => {
  const note = makeNote();
  assert.equal(noteMatchesSearch(note, searchTokens("retro offsite")), true);
  assert.equal(noteMatchesSearch(note, searchTokens("retro holiday")), false);
});

test("noteMatchesSearch does not match the author", () => {
  assert.equal(noteMatchesSearch(makeNote(), searchTokens("ada")), false);
});

test("noteMatchesSearch keeps every note for a blank query", () => {
  assert.equal(noteMatchesSearch(makeNote(), searchTokens("   ")), true);
});
