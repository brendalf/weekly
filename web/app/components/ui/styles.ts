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
