"use client";

import { useCallback, useId, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ChevronsUp } from "@gravity-ui/icons";
import { focusRing, touchRowCoarse } from "./styles";

/**
 * The one collapse implementation. Replaces the five copies of
 * `useState(false)` + ad-hoc chevron (`PeriodPanel`, `HabitsTasksView`,
 * `NoteList`, `HabitList`, `TaskList`).
 *
 * The chevron is **persistent and rotates** — the old
 * `general/SectionHeader` rendered it only while collapsed, so an expanded
 * section advertised no way to collapse it (DIRECTION §7). `NoteList` had the
 * right pattern; this is that pattern, plus `aria-expanded`/`aria-controls`, a
 * 44px row, a focus ring, and the shared `.collapsible` grid transition from
 * `globals.css`.
 */

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_PREFIX = "weekly:collapsed:";
/** Fired on every write so sibling `Collapsible`s with the same key follow. */
const STORAGE_EVENT = "weekly:collapsed-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStored(key: string | undefined): string | null {
  if (!key) return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    // Private-mode Safari throws on access; fall back to local state.
    return null;
  }
}

function writeStored(key: string, collapsed: boolean) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, collapsed ? "1" : "0");
  } catch {
    /* non-critical */
  }
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

/**
 * Collapse state for one section, persisted when `storageKey` is given.
 *
 * `useSyncExternalStore` (not `useEffect` + `setState`) so the server snapshot
 * is `null` and hydration cannot mismatch — and so the lint rule
 * `react-hooks/set-state-in-effect` stays happy.
 */
function useCollapsedState(
  storageKey: string | undefined,
  defaultCollapsed: boolean,
  controlled: boolean | undefined,
  onCollapsedChange: ((collapsed: boolean) => void) | undefined,
) {
  const [local, setLocal] = useState(defaultCollapsed);
  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey),
    () => null,
  );

  const collapsed =
    controlled ??
    (storageKey ? (stored === null ? defaultCollapsed : stored === "1") : local);

  const toggle = useCallback(() => {
    const next = !collapsed;
    if (controlled === undefined) {
      if (storageKey) writeStored(storageKey, next);
      else setLocal(next);
    }
    onCollapsedChange?.(next);
  }, [collapsed, controlled, storageKey, onCollapsedChange]);

  return { collapsed, toggle };
}

/* -------------------------------------------------------------------------- */
/* SectionHeader                                                              */
/* -------------------------------------------------------------------------- */

export interface SectionHeaderProps {
  /** Section name. Rendered small, bold, and uppercase. */
  label: string;
  /** Whether the body is hidden. Drives the chevron and `aria-expanded`. */
  collapsed: boolean;
  /** Called when the header is activated by click, `Enter`, or `Space`. */
  onToggle: () => void;
  /**
   * Count shown next to the label — `"3/7"`, `"12"`. Visible in both states,
   * unlike the old header which only showed it while collapsed.
   */
  count?: ReactNode;
  /**
   * Controls rendered at the right end, *outside* the toggle button so they
   * stay independently clickable.
   */
  actions?: ReactNode;
  /** `id` of the region this header toggles, for `aria-controls`. */
  controls?: string;
  /** Extra classes on the header row. */
  className?: string;
}

export function SectionHeader({
  label,
  collapsed,
  onToggle,
  count,
  actions,
  controls,
  className,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 pb-1 ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-controls={controls}
        onClick={onToggle}
        className={`flex flex-1 cursor-pointer items-center gap-1.5 rounded-lg text-left select-none ${touchRowCoarse} ${focusRing}`}
      >
        <ChevronsUp
          width={12}
          height={12}
          aria-hidden
          className={`shrink-0 text-subtle transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
        />
        <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
          {label}
        </p>
        {count !== undefined && count !== null && (
          <p className="text-xs text-subtle">{count}</p>
        )}
      </button>
      {actions}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Collapsible                                                               */
/* -------------------------------------------------------------------------- */

export interface CollapsibleProps {
  /** Section name, passed through to `SectionHeader`. */
  label: string;
  /** Section body. */
  children: ReactNode;
  /** Count shown next to the label. */
  count?: ReactNode;
  /** Controls rendered at the right end of the header row. */
  actions?: ReactNode;
  /** Collapsed state on first render, when nothing is stored. @default false */
  defaultCollapsed?: boolean;
  /**
   * Persist collapse state under this key (`localStorage`, prefixed
   * `weekly:collapsed:`). Omit for local-only state. WS12 turns persistence on
   * across the app simply by passing a key here.
   */
  storageKey?: string;
  /** Controlled collapse state. Pair with `onCollapsedChange`. */
  collapsed?: boolean;
  /** Called with the next collapse state on every toggle. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Extra classes on the wrapper. */
  className?: string;
  /** Extra classes on the body wrapper. */
  bodyClassName?: string;
}

export function Collapsible({
  label,
  children,
  count,
  actions,
  defaultCollapsed = false,
  storageKey,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
  bodyClassName,
}: CollapsibleProps) {
  const regionId = useId();
  const { collapsed, toggle } = useCollapsedState(
    storageKey,
    defaultCollapsed,
    controlledCollapsed,
    onCollapsedChange,
  );

  return (
    <div className={className}>
      <SectionHeader
        label={label}
        collapsed={collapsed}
        onToggle={toggle}
        count={count}
        actions={actions}
        controls={regionId}
      />
      {/* `.collapsible` (globals.css) animates grid-template-rows 1fr → 0fr on
          the shared 250ms curve; its direct child must be the overflow box.
          `inert` keeps collapsed content out of the tab order. */}
      <div
        id={regionId}
        className={`collapsible${collapsed ? " collapsed" : ""}`}
        inert={collapsed}
      >
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
}
