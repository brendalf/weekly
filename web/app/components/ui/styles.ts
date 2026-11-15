/**
 * Shared class fragments for the `ui/` primitives.
 *
 * These exist so the two rules every primitive must honor — a visible
 * `focus-visible` ring and a 44px minimum touch target (DIRECTION §6.8) — are
 * spelled exactly one way. Composed into primitives; also exported for the
 * app-level controls that are not primitives (rows, tabs, toolbar buttons).
 */

/**
 * Visible keyboard focus ring. Uses the brand token so it reads in both themes,
 * and `focus-visible` so a mouse press does not light it up.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** Minimum touch target (DIRECTION §6.8): 44×44px for icon-only controls. */
export const touchTarget = "min-h-11 min-w-11";

/** Minimum touch target for full-width rows, which only need the height. */
export const touchRow = "min-h-11";

/**
 * 44px row height on coarse pointers only. For dense chrome — section headers,
 * list affordances — where a permanent 44px row would bloat the desktop layout
 * but a thumb still needs something to hit.
 */
export const touchRowCoarse = "pointer-coarse:min-h-11";

/* -------------------------------------------------------------- sheets -- */

/**
 * The mobile bottom-sheet treatment (DIRECTION §2.6, §5), spelled once.
 *
 * `NoteDetailsModal` and `NoteAddModal` were the only surfaces in the app that
 * got this right; `DetailPanel` lifted it, then `HabitDetailsModal`,
 * `TaskDetailsModal` and `HabitAddModal` still needed it — a fourth copy. So
 * the two class strings live here and every sheet references them.
 *
 * Pair them: `sheetContainer` on `Modal.Container` (which must also carry
 * `placement="bottom"`), `sheetDialog` on `Modal.Dialog`. Below `sm:` the
 * dialog is a full-height sheet anchored to the bottom edge, with the home-bar
 * inset added to its padding; at `sm:` and up it becomes a centered,
 * `85dvh`-capped dialog again.
 */
export const sheetContainer = "p-0 sm:p-10";

/** @see sheetContainer */
export const sheetDialog =
  "h-full max-h-full rounded-b-none rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[85dvh] sm:rounded-3xl sm:p-6 sm:pb-6";
