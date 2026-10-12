"use client";

import { useEffect, useMemo, useState } from "react";
import type { Habit, Note, Task } from "@weekly/domain";
import {
  habitMatchesSearch,
  noteMatchesSearch,
  searchTokens,
  taskMatchesSearch,
} from "@weekly/domain";
import { searchStore, useSearchStore } from "../stores/search";

/**
 * The global filter, applied to whatever a route shows (PLAN WS11).
 *
 * This is `useHabitTaskSearch` generalized: same debounce, same
 * `AbortController` discipline, now covering **notes** as well as habits and
 * tasks, and reading its query from `searchStore` instead of owning it — the
 * field moved to the shell header, so the query had to become shared state.
 *
 * Two mechanisms keep typing cheap on a list of any size:
 *
 * 1. **Debounce** (in `searchStore`): a query is only applied once typing
 *    settles, so a five-character word costs one pass, not five.
 * 2. **Abortable, chunked passes** (here): filtering yields to the event loop
 *    every `CHUNK_SIZE` items and checks an `AbortSignal` between slices. A new
 *    query — or a habit/task/note update arriving from Firestore — aborts the
 *    pass in flight, so a slower earlier run can never overwrite newer results.
 *
 * The matchers themselves live in `@weekly/domain` (`core/search.ts`), not
 * here: what counts as a match is domain logic, and `/app/review` and the Expo
 * client need the same answers.
 */

/** Items scanned per slice before yielding, so filtering never blocks a frame. */
const CHUNK_SIZE = 200;

/** Shared empty list, so an absent input never changes identity per render. */
const EMPTY: never[] = [];

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

/** The three lists the filter can cover. Each is optional per route. */
export interface ItemSearchInput<
  H extends Habit = Habit,
  T extends Task = Task,
  N extends Note = Note,
> {
  habits?: H[];
  tasks?: T[];
  notes?: N[];
}

export interface ItemSearchResult<
  H extends Habit = Habit,
  T extends Task = Task,
  N extends Note = Note,
> {
  /** Raw query — what the field shows, updated on every keystroke. */
  query: string;
  /** The query these results were produced for. Blank when no filter is on. */
  appliedQuery: string;
  /** True once a non-blank query has actually been applied to the lists. */
  isActive: boolean;
  /** True while debouncing or filtering. */
  isSearching: boolean;
  /** Habits matching the applied query (the input list when no query). */
  habits: H[];
  /** Tasks matching the applied query (the input list when no query). */
  tasks: T[];
  /** Notes matching the applied query (the input list when no query). */
  notes: N[];
}

interface Pass<H, T, N> {
  /** Query these results belong to; stale results are ignored. */
  query: string;
  habits: H[];
  tasks: T[];
  notes: N[];
}

/**
 * One abortable filtering pass over the given lists for an already-debounced
 * query. `null` until a pass for exactly that query has completed.
 *
 * @internal Exported only for the deprecated `useHabitTaskSearch` shim, which
 * still owns its own local query. Use {@link useItemSearch}.
 */
export function useFilterPass<
  H extends Habit,
  T extends Task,
  N extends Note,
>(
  appliedQuery: string,
  habits: H[],
  tasks: T[],
  notes: N[],
): Pass<H, T, N> | null {
  const [pass, setPass] = useState<Pass<H, T, N> | null>(null);

  const tokens = useMemo(() => searchTokens(appliedQuery), [appliedQuery]);

  useEffect(() => {
    // Nothing to filter. The last pass stays in state untouched — clearing it
    // here would be a second render for a value the read below already
    // ignores, because results only count for the query currently applied.
    if (tokens.length === 0) return;

    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      try {
        const [matchedHabits, matchedTasks, matchedNotes] = await Promise.all([
          filterInChunks(habits, (h) => habitMatchesSearch(h, tokens), signal),
          filterInChunks(tasks, (t) => taskMatchesSearch(t, tokens), signal),
          filterInChunks(notes, (n) => noteMatchesSearch(n, tokens), signal),
        ]);
        signal.throwIfAborted();
        setPass({
          query: appliedQuery,
          habits: matchedHabits,
          tasks: matchedTasks,
          notes: matchedNotes,
        });
      } catch {
        // Aborted: a newer pass owns the results.
      }
    })();

    return () => controller.abort();
  }, [appliedQuery, tokens, habits, tasks, notes]);

  // Results only count while they belong to the query currently applied.
  return tokens.length > 0 && pass?.query === appliedQuery ? pass : null;
}

/**
 * Filters a route's lists by the global query.
 *
 * ```ts
 * const { habits, isActive, appliedQuery } = useItemSearch({ habits: allHabits });
 * ```
 *
 * Pass only the lists the route shows. Omitted lists come back empty, and with
 * no query every list comes back exactly as it went in — so a route can render
 * `search.habits` unconditionally.
 */
export function useItemSearch<
  H extends Habit = Habit,
  T extends Task = Task,
  N extends Note = Note,
>(input: ItemSearchInput<H, T, N>): ItemSearchResult<H, T, N> {
  const query = useSearchStore((s) => s.query);
  const appliedQuery = useSearchStore((s) => s.appliedQuery);

  const habits = (input.habits ?? EMPTY) as H[];
  const tasks = (input.tasks ?? EMPTY) as T[];
  const notes = (input.notes ?? EMPTY) as N[];

  const pass = useFilterPass(appliedQuery, habits, tasks, notes);

  const isSettling = query !== appliedQuery;
  const hasQuery = searchTokens(appliedQuery).length > 0;

  return {
    query,
    appliedQuery: pass ? appliedQuery : "",
    isActive: pass !== null,
    // While typing settles there is no pass yet but a filter is coming; once
    // settled, a non-blank query with no pass means one is still running.
    isSearching: isSettling
      ? searchTokens(query).length > 0
      : hasQuery && pass === null,
    habits: pass?.habits ?? habits,
    tasks: pass?.tasks ?? tasks,
    notes: pass?.notes ?? notes,
  };
}

/**
 * Writes the global query. Only the shell's filter field should call this;
 * routes read results through {@link useItemSearch}.
 */
export function setGlobalSearchQuery(value: string): void {
  searchStore.setQuery(value);
}
