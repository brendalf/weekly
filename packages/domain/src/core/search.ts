import { Habit } from "../models/habit";
import { Task } from "../models/task";

/**
 * Normalizes text for comparison: strips diacritics, lowercases, collapses
 * whitespace. "Ler  Livro" and "ler livro" normalize to the same string.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits a raw query into normalized tokens. Every token must match for an
 * item to be considered a hit, so "read book" finds "Read a book".
 * Returns an empty array for a blank query (meaning "no filter").
 */
export function searchTokens(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ");
}

/** True when every token appears in the already-normalized text. */
export function matchesSearchTokens(
  normalizedText: string,
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) => normalizedText.includes(token));
}

/**
 * Searchable text for a habit: its name plus its time of day, so "morning"
 * narrows down to morning habits. Period is excluded — the period tabs
 * already filter on it.
 */
export function habitSearchText(habit: Habit): string {
  return normalizeSearchText(
    habit.timeOfDay ? `${habit.name} ${habit.timeOfDay}` : habit.name,
  );
}

/** Searchable text for a task: its title. */
export function taskSearchText(task: Task): string {
  return normalizeSearchText(task.title);
}

export function habitMatchesSearch(habit: Habit, tokens: string[]): boolean {
  return matchesSearchTokens(habitSearchText(habit), tokens);
}

export function taskMatchesSearch(task: Task, tokens: string[]): boolean {
  return matchesSearchTokens(taskSearchText(task), tokens);
}
