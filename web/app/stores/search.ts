"use client";

import { useSyncExternalStore } from "react";
import { normalizeSearchText } from "@weekly/domain";

/**
 * The **one** filter's state (PLAN WS11, DIRECTION §4).
 *
 * The app used to ship two filters with different scopes, implementations and
 * styling — a HeroUI `SearchField` in the week toolbar and a hand-rolled
 * `<input>` inside `NoteList` that only appeared above five notes. There is now
 * a single field, in the shell header, and this store is what makes that
 * possible: the field lives in the header while the lists it filters live in
 * routes, so the query cannot be component state.
 *
 * Why a store rather than context: the header writes on every keystroke and the
 * list re-filters; routing the query through the `/app` layout's context would
 * re-render the whole shell (nav, workspace switcher, notification bell) on
 * each character. Same `useSyncExternalStore` shape as `calendarStore` and
 * `workspaceStore`.
 *
 * Two values, not one:
 * - `query` is the raw input value, updated on every keystroke, and is what the
 *   field renders;
 * - `appliedQuery` is the debounced one, and is what the lists filter on and
 *   what gets written to `?q=`.
 *
 * The debounce lives here rather than in `useItemSearch` because the input and
 * the consumers are now different components — one timer, one applied value,
 * so the URL and every list always agree. The abortable filtering pass stays in
 * the hook.
 */

/** How long typing has to settle before a query is applied. */
export const SEARCH_DEBOUNCE_MS = 250;

export interface SearchState {
  /** Raw input value — updates on every keystroke. */
  query: string;
  /** Debounced query: what lists filter on and what `?q=` holds. */
  appliedQuery: string;
}

type Listener = () => void;

let state: SearchState = { query: "", appliedQuery: "" };

const listeners = new Set<Listener>();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function emitChange() {
  for (const l of listeners) l();
}

function setState(partial: Partial<SearchState>) {
  const next = { ...state, ...partial };
  if (next.query === state.query && next.appliedQuery === state.appliedQuery) {
    return;
  }
  state = next;
  emitChange();
}

function cancelDebounce() {
  if (debounceTimer === null) return;
  clearTimeout(debounceTimer);
  debounceTimer = null;
}

/**
 * The shell's filter input, registered so anything can focus it by name — the
 * WS12 keyboard hook binds `/` to {@link focusGlobalSearch}, which calls this.
 * Only one filter is ever mounted (it is in the shell header), so a single slot
 * is enough.
 */
let focusHandler: (() => void) | null = null;

export const searchStore = {
  getState(): SearchState {
    return state;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Types into the filter. Debounced into `appliedQuery`, except for clearing:
   * emptying the field should feel instant, there is nothing to settle.
   */
  setQuery(value: string) {
    cancelDebounce();
    if (!normalizeSearchText(value)) {
      setState({ query: value, appliedQuery: "" });
      return;
    }
    setState({ query: value });
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      setState({ appliedQuery: state.query });
    }, SEARCH_DEBOUNCE_MS);
  },

  /**
   * Sets both values at once, with no debounce. For adopting `?q=` from the
   * URL — on load, on Back/Forward, and when leaving a route drops the param.
   */
  setQueryImmediate(value: string) {
    cancelDebounce();
    setState({ query: value, appliedQuery: value });
  },

  /** Empties the filter. `Esc`, and leaving a route that had a query. */
  clear() {
    searchStore.setQueryImmediate("");
  },

  /**
   * Called by the shell's filter field on mount. Returns the unregister
   * function for the effect's cleanup.
   */
  registerFocusHandler(handler: () => void) {
    focusHandler = handler;
    return () => {
      if (focusHandler === handler) focusHandler = null;
    };
  },

  /**
   * Focuses and selects the filter input.
   *
   * Returns `false` when no filter is mounted — the current route has nothing
   * to filter (`/app/review`, `/app/settings`) — so a caller can fall through
   * to its own handling of the key instead of swallowing it.
   */
  focus(): boolean {
    if (!focusHandler) return false;
    focusHandler();
    return true;
  },
};

/**
 * Focus the global filter. **This is the entry point for the WS12 keyboard
 * hook's `/` binding** — bind the key, call this, and `preventDefault()` when
 * it returns `true` (returns `false` on routes with no filter, so the key can
 * fall through).
 */
export function focusGlobalSearch(): boolean {
  return searchStore.focus();
}

/**
 * Clear the global filter. The WS12 keyboard hook's `Esc` chain can call this;
 * it is a no-op when the filter is already empty.
 */
export function clearGlobalSearch(): void {
  searchStore.clear();
}

/** Subscribe to a slice of the filter state. */
export function useSearchStore<T>(selector: (s: SearchState) => T): T {
  return useSyncExternalStore(
    searchStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}

/* ----------------------------------------------------------------- scope -- */

/**
 * What the filter covers on a given route. One field, scoped to what is on
 * screen — the user never has to ask which filter does what (DIRECTION §4).
 */
export interface SearchScope {
  /** Route prefix this scope owns, including its detail routes. */
  href: string;
  /** `aria-label` for the field. */
  label: string;
  /** Placeholder, naming exactly what will be filtered. */
  placeholder: string;
}

/**
 * The routes with a filter.
 *
 * `/app/week` is **not** here yet: it still renders its own `SearchBox` in
 * `components/week/WeekToolbar.tsx` (WS4's file), and a second field in the
 * header would recreate the exact two-filter confusion WS11 exists to remove.
 *
 * TODO(WS4): when the week toolbar drops its `SearchBox` and `app/week/page.tsx`
 * switches to `useItemSearch({ habits, tasks })`, add
 * `{ href: "/app/week", label: "Filter habits and tasks", placeholder: "Filter the week…" }`
 * here and delete `hooks/useHabitTaskSearch.ts`.
 *
 * `/app/review` and `/app/settings` have no list to filter, so they get no
 * field at all — which is route scoping, not threshold-gating: the filter's
 * presence never depends on how many items happen to exist (DIRECTION §4).
 */
export const SEARCH_SCOPES: SearchScope[] = [
  {
    href: "/app/habits",
    label: "Filter habits",
    placeholder: "Filter habits…",
  },
  { href: "/app/tasks", label: "Filter tasks", placeholder: "Filter tasks…" },
  { href: "/app/notes", label: "Filter notes", placeholder: "Filter notes…" },
];

/**
 * The scope owning `pathname`, or `null` on a route with nothing to filter.
 * Prefix-matched so a detail panel (`/app/notes/abc123`) keeps the filter — the
 * list is still mounted behind it.
 */
export function searchScopeForPath(pathname: string): SearchScope | null {
  return (
    SEARCH_SCOPES.find(
      (scope) =>
        pathname === scope.href || pathname.startsWith(`${scope.href}/`),
    ) ?? null
  );
}
