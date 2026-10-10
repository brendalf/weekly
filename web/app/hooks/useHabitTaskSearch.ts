"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Habit, Task } from "@weekly/domain";
import {
  habitMatchesSearch,
  normalizeSearchText,
  searchTokens,
  taskMatchesSearch,
} from "@weekly/domain";

/** How long typing has to settle before a query is applied. */
const DEBOUNCE_MS = 250;

/** Items scanned per slice before yielding, so filtering never blocks a frame. */
const CHUNK_SIZE = 200;

/** Resolves after a macrotask, or rejects as soon as the signal aborts. */
function yieldToEventLoop(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 0);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Filters in slices, checking the abort signal between them: a superseded
 * search stops scanning instead of running to completion.
 */
async function filterInChunks<T>(
  items: T[],
  predicate: (item: T) => boolean,
  signal: AbortSignal,
): Promise<T[]> {
  const matched: T[] = [];
  for (let start = 0; start < items.length; start += CHUNK_SIZE) {
    signal.throwIfAborted();
    const end = Math.min(start + CHUNK_SIZE, items.length);
    for (let i = start; i < end; i++) {
      if (predicate(items[i])) matched.push(items[i]);
    }
    if (end < items.length) await yieldToEventLoop(signal);
  }
  return matched;
}

interface SearchResults {
  /** Query these results were produced for; stale results are ignored. */
  query: string;
  habits: Habit[];
  tasks: Task[];
}

export interface HabitTaskSearch {
  /** Raw input value — updates on every keystroke. */
  query: string;
  setQuery: (value: string) => void;
  /** True once a non-blank query has actually been applied to the lists. */
  isActive: boolean;
  /** True while debouncing or filtering. */
  isSearching: boolean;
  /** Habits matching the applied query (all habits when no query). */
  habits: Habit[];
  /** Tasks matching the applied query (all tasks when no query). */
  tasks: Task[];
}

/**
 * Debounced, abortable search over habits and tasks.
 *
 * Keystrokes are debounced so a query is only applied once typing settles, and
 * each filtering pass runs under an AbortController: a new query (or a habit /
 * task update arriving from Firestore) aborts the pass in flight, so a slower
 * earlier run can never overwrite newer results.
 */
export function useHabitTaskSearch(
  habits: Habit[],
  tasks: Task[],
  debounceMs: number = DEBOUNCE_MS,
): HabitTaskSearch {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);

  const tokens = useMemo(() => searchTokens(appliedQuery), [appliedQuery]);
  const hasQuery = tokens.length > 0;
  // Results only count while they belong to the query currently applied.
  const current = hasQuery && results?.query === appliedQuery ? results : null;

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Clearing should feel instant — there is nothing to debounce.
    if (!normalizeSearchText(value)) {
      setAppliedQuery("");
      setResults(null);
    }
  }, []);

  // Debounce keystrokes into the applied query.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Run (and re-run) the filtering pass for the applied query.
  useEffect(() => {
    if (tokens.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      try {
        const [matchedHabits, matchedTasks] = await Promise.all([
          filterInChunks(habits, (h) => habitMatchesSearch(h, tokens), signal),
          filterInChunks(tasks, (t) => taskMatchesSearch(t, tokens), signal),
        ]);
        signal.throwIfAborted();
        setResults({
          query: appliedQuery,
          habits: matchedHabits,
          tasks: matchedTasks,
        });
      } catch {
        // Aborted: a newer pass owns the results.
      }
    })();

    return () => controller.abort();
  }, [appliedQuery, tokens, habits, tasks]);

  const isSettling = query !== appliedQuery;

  return {
    query,
    setQuery: handleQueryChange,
    isActive: current !== null,
    isSearching: isSettling
      ? normalizeSearchText(query).length > 0
      : hasQuery && current === null,
    habits: current?.habits ?? habits,
    tasks: current?.tasks ?? tasks,
  };
}
