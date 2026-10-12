"use client";

import type { ReactNode } from "react";
import { SectionHeader as UiSectionHeader } from "../ui";
import { usePersistedCollapse } from "../../hooks/usePersistedCollapse";

/**
 * The legacy section header, now a thin adapter over the WS2
 * `ui/SectionHeader` (PLAN WS12).
 *
 * What it used to be: a `<div onClick>` — not focusable, not
 * `Enter`-activatable, no `aria-expanded`, and a chevron that rendered **only
 * while collapsed**, so an expanded section advertised no way to collapse it
 * (DIRECTION §7, §6.8). The shared header fixes all four; keeping this file as
 * an adapter means `PeriodPanel` picks the fix up without a change on its side.
 *
 * Two additions over the old signature, both optional and both backwards
 * compatible:
 *
 * - `storageKey` — drop the `collapsed` / `onToggle` pair and the header owns
 *   its state, persisted across navigation (DIRECTION §7, "collapsed state
 *   never persists"). The body still has to react to it, so a caller whose
 *   body is a hand-rolled `.collapsible` div wants
 *   {@link usePersistedCollapse} directly instead.
 * - `actions` — controls at the right end, outside the toggle button.
 *
 * New sections should use `ui/Collapsible`, which owns header *and* body.
 */
interface SectionHeaderProps {
  /** Section name. Rendered small, bold, uppercase. */
  label: string;
  /** Controlled collapse state. Omit and pass `storageKey` for self-managed. */
  collapsed?: boolean;
  /** Called on click, `Enter`, or `Space`. Required when `collapsed` is given. */
  onToggle?: () => void;
  /** Completed count, shown as `done/total` when `total` is above zero. */
  done?: number;
  /** Total count. */
  total?: number;
  /**
   * Persist collapse state under this key when the header is uncontrolled.
   * Shares `localStorage` namespace with `ui/Collapsible`.
   */
  storageKey?: string;
  /** Collapsed on first render, before the user has toggled it. */
  defaultCollapsed?: boolean;
  /** `id` of the region this header toggles, for `aria-controls`. */
  controls?: string;
  /** Controls at the right end, outside the toggle button. */
  actions?: ReactNode;
}

export function SectionHeader({
  label,
  collapsed,
  onToggle,
  done = 0,
  total = 0,
  storageKey,
  defaultCollapsed = false,
  controls,
  actions,
}: SectionHeaderProps) {
  // Hooks cannot be conditional; the fallback key is only ever read when the
  // header is uncontrolled *and* no `storageKey` was given, in which case the
  // header is behaving as a plain local toggle anyway.
  const [storedCollapsed, toggleStored] = usePersistedCollapse(
    storageKey ?? "section:unnamed",
    defaultCollapsed,
  );

  const isControlled = collapsed !== undefined;

  return (
    <UiSectionHeader
      label={label}
      collapsed={isControlled ? collapsed : storedCollapsed}
      onToggle={isControlled ? (onToggle ?? (() => {})) : toggleStored}
      count={total > 0 ? `${done}/${total}` : undefined}
      controls={controls}
      actions={actions}
    />
  );
}
