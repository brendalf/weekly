"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Collapse state that survives navigation (PLAN WS12 / DIRECTION §7).
 *
 * `PeriodPanel`, `HabitsTasksView`, `NoteList`, `HabitList` and `TaskList`
 * each hold a private `useState(false)`, so collapsing a section and changing
 * route puts it straight back. The WS2 `Collapsible` already solved this for
 * the sections it owns, via its `storageKey` prop.
 *
 * This hook is the same state, unbundled from that component, for the headers
 * that are **not** a `Collapsible` — a section whose body is a hand-rolled
 * `.collapsible` div, or one that drives other state from the same toggle.
 * It reads and writes the *same* `localStorage` keys and fires the *same*
 * change event as `ui/Collapsible`, so a key used by both stays in sync.
 *
 * ```tsx
 * const [collapsed, toggle] = usePersistedCollapse("week:habits");
 * <SectionHeader collapsed={collapsed} onToggle={toggle} … />
 * ```
 *
 * `useSyncExternalStore` rather than `useEffect` + `setState`: the server
 * snapshot is `null`, so hydration cannot mismatch, and the lint rule
 * `react-hooks/set-state-in-effect` stays satisfied.
 *
 * WS15 should fold this and `ui/Collapsible`'s private copy into one exported
 * primitive; they are deliberately byte-compatible until then.
 */

/** Must match `ui/Collapsible`. */
const STORAGE_PREFIX = "weekly:collapsed:";
/** Must match `ui/Collapsible`. Fired on every write so siblings follow. */
const STORAGE_EVENT = "weekly:collapsed-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    // Private-mode Safari throws on access.
    return null;
  }
}

function write(key: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, collapsed ? "1" : "0");
  } catch {
    /* non-critical */
  }
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

/**
 * @param storageKey Section identity, e.g. `"week:habits"`. Namespaced under
 *   `weekly:collapsed:` in `localStorage`.
 * @param defaultCollapsed Used until the user has toggled the section once.
 * @returns `[collapsed, toggle, setCollapsed]`
 */
export function usePersistedCollapse(
  storageKey: string,
  defaultCollapsed = false,
): [boolean, () => void, (collapsed: boolean) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null,
  );

  const collapsed = stored === null ? defaultCollapsed : stored === "1";

  const setCollapsed = useCallback(
    (next: boolean) => write(storageKey, next),
    [storageKey],
  );

  const toggle = useCallback(
    () => write(storageKey, !collapsed),
    [storageKey, collapsed],
  );

  return [collapsed, toggle, setCollapsed];
}
