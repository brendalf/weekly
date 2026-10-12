"use client";

import { useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { focusRing } from "../components/ui";

/**
 * The focusable-row contract (PLAN WS12 / DIRECTION §6.8).
 *
 * `TaskItem` was a `<div onClick>`: not focusable, not `Enter`-activatable,
 * invisible to a screen reader. The obvious fix — make the row a `<button>` —
 * is illegal here, because a habit row already contains two interactive
 * controls (the progress ring and the `⋯` menu) and a button may not nest a
 * button.
 *
 * So the row uses the **stretched-link** pattern instead:
 *
 * ```
 * <div className={rowShell} {...rowKeys}>        ← plain div, no handlers of its own
 *   <CircularCheckboxProgress className={rowControl} />   ← real button, above the link
 *   <Link className={rowLink} data-weekly-row>…</Link>    ← the row in the tab order
 *   <ActionMenu triggerClassName={rowControl} />          ← real button, above the link
 * </div>
 * ```
 *
 * `rowLink` paints an `::after` across the whole row, so the *entire* row is
 * one click target and one tab stop with the title as its accessible name,
 * while the two nested controls sit above that overlay on their own z-index
 * and keep their own semantics. `rowShell` draws the focus ring around the
 * whole row whenever the link inside it has focus, so the ring matches what a
 * click would hit.
 *
 * That covers `Tab` and `Enter` natively. `useRowKeys` adds the two keys the
 * platform does not give us: `x` and `Space` to toggle completion.
 */

/** Marks the element that represents a row in the tab order. */
export const ROW_ATTR = "data-weekly-row";

/** Selector for every row currently on screen, in DOM order. */
export const ROW_SELECTOR = "[data-weekly-row]";

/**
 * The row container. A plain `div`: it carries no handlers and no `tabIndex`,
 * so nothing competes with the real controls inside it. Cross-axis alignment
 * is left to the caller (`items-center` for a single-line row,
 * `items-stretch` for a multi-line one).
 */
export const rowShell = [
  "group relative flex gap-2 rounded-lg border border-border bg-background",
  "transition-colors hover:border-border-strong",
  // The ring belongs to the whole row, not to the title inside it — it should
  // match what a click would hit.
  "has-[[data-weekly-row]:focus-visible]:outline-2",
  "has-[[data-weekly-row]:focus-visible]:outline-offset-2",
  "has-[[data-weekly-row]:focus-visible]:outline-brand",
].join(" ");

/**
 * The stretched link/button. `after:absolute after:inset-0` turns the whole
 * row into its hit area; `outline-none` because `rowShell` draws the ring.
 *
 * The overlay is positioned against `rowShell`, which is also what makes it
 * immune to an `overflow-hidden` wrapper in between: an absolutely positioned
 * box is only clipped by ancestors inside its containing block chain. The
 * rows rely on that — they need `overflow-hidden` on the text column so a
 * habit with four badges cannot push the page sideways on a phone, and they
 * need the hit area to cover the row anyway.
 */
export const rowLink = [
  "min-w-0 flex-1 cursor-pointer text-left",
  "after:absolute after:inset-0 after:content-['']",
  "focus:outline-none",
].join(" ");

/**
 * A control that must stay clickable *above* the stretched link — the progress
 * ring, the `⋯` trigger, the pin toggle.
 */
export const rowControl = `relative z-10 ${focusRing}`;

/** Focuses the row `delta` places from the focused one. Returns `true` if it moved. */
export function focusAdjacentRow(delta: 1 | -1): boolean {
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(ROW_SELECTOR),
  ).filter(
    (el) =>
      // A collapsed `Collapsible` marks its body `inert` rather than
      // unmounting it, so its rows are still in the DOM — and still have
      // layout boxes inside the clipped grid row. `j` must skip them for the
      // same reason `Tab` does.
      !el.closest("[inert]") &&
      (el.offsetParent !== null || el.getClientRects().length > 0),
  );
  if (rows.length === 0) return false;

  const active = document.activeElement;
  const current =
    active instanceof HTMLElement
      ? rows.indexOf(active.closest<HTMLElement>(ROW_SELECTOR) ?? active)
      : -1;

  // Nothing focused yet: `j` starts at the top, `k` at the bottom.
  const next =
    current === -1
      ? delta === 1
        ? 0
        : rows.length - 1
      : Math.min(Math.max(current + delta, 0), rows.length - 1);

  rows[next]?.focus();
  rows[next]?.scrollIntoView({ block: "nearest" });
  return true;
}

export interface RowKeysOptions {
  /** `x` / `Space` on the focused row. Omit for rows with nothing to toggle. */
  onToggle?: () => void;
}

/**
 * Key handling for a row container. Spread onto the `rowShell` element.
 *
 * Only reacts when the event came from the row's own link — a keypress inside
 * the `⋯` menu or on the progress ring belongs to that control.
 */
export function useRowKeys({ onToggle }: RowKeysOptions) {
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!onToggle) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.matches(ROW_SELECTOR)) return;

      if (event.key === "x" || event.key === "X" || event.key === " ") {
        // `Space` would otherwise click a `<button>` row (opening the detail)
        // or scroll the page on an `<a>` row.
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  return { onKeyDown };
}
