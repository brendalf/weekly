"use client";

import { useCallback, useEffect, useState } from "react";
import type { Habit, Task } from "@weekly/domain";
import { normalizeSearchText } from "@weekly/domain";
import { SEARCH_DEBOUNCE_MS } from "../stores/search";
import { useFilterPass } from "./useItemSearch";

/**
 * @deprecated Use {@link useItemSearch} with the shell header's filter.
 *
 * WS11 replaced the two filters with one, in the shell header, backed by
 * `searchStore` + `useItemSearch`. This shim is all that is left of
 * `useHabitTaskSearch`: it keeps the old *local* query API alive for
 * `/app/week`, the one route WS11 is not allowed to edit, and reuses the
 * generalized hook's abortable filtering pass so the two cannot drift.
 *
 * TODO(WS4): `app/app/week/page.tsx` is the last caller, feeding
 * `components/week/WeekToolbar.tsx`'s `SearchBox`. Replace both with
 * `useItemSearch({ habits, tasks })` and the header's field, add `/app/week`
 * to `SEARCH_SCOPES` in `stores/search.ts`, and delete this file — until then
 * the week planner is the one route with its own filter, which is the thing
 * DIRECTION §4 exists to end.
 */
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

const NO_NOTES: never[] = [];

/** @deprecated See {@link HabitTaskSearch}. */
export function useHabitTaskSearch(
  habits: Habit[],
  tasks: Task[],
  debounceMs: number = SEARCH_DEBOUNCE_MS,
): HabitTaskSearch {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Clearing should feel instant — there is nothing to debounce.
    if (!normalizeSearchText(value)) setAppliedQuery("");
  }, []);

  // Debounce keystrokes into the applied query.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const pass = useFilterPass(appliedQuery, habits, tasks, NO_NOTES);

  const isSettling = query !== appliedQuery;

  return {
    query,
    setQuery: handleQueryChange,
    isActive: pass !== null,
    isSearching: isSettling
      ? normalizeSearchText(query).length > 0
      : normalizeSearchText(appliedQuery).length > 0 && pass === null,
    habits: pass?.habits ?? habits,
    tasks: pass?.tasks ?? tasks,
  };
}
