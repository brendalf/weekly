"use client";

import { useSyncExternalStore } from "react";

/**
 * One polite live region for the whole app (PLAN WS14).
 *
 * ## Why this exists
 *
 * Marking a habit or ticking a task is an **optimistic** update: the row
 * repaints before the write lands. Visually that is obvious — the ring fills,
 * the `3/5` becomes `4/5`, the title gets a strikethrough. To a screen reader
 * it is close to silent. The ring is a `<button aria-pressed>`, so a *toggle*
 * is announced, but a habit with `times > 1` is not a toggle: four presses on
 * a 5× habit change nothing that assistive tech reports, and the count that
 * did change is static text nobody is looking at.
 *
 * So the action announces itself. `announce()` writes a sentence into a single
 * `aria-live="polite"` region rendered once by `LiveRegion` in the `/app`
 * shell.
 *
 * ## Why one region, written imperatively
 *
 * A region per row would mean dozens of live regions on a list route, and a
 * region that mounts *with* its message is never announced — the element has
 * to already exist when its text changes. One long-lived region, mutated after
 * mount, is the pattern that actually works in NVDA/VoiceOver.
 *
 * `polite` (never `assertive`): these are confirmations of something the user
 * just did, so they must queue behind whatever is speaking rather than
 * interrupt it. Failures do not come through here — they are `toast.error`,
 * and `sonner`'s toaster is itself an `aria-live="polite"` region.
 *
 * ## The repeat problem
 *
 * Marking the same habit twice produces the same sentence twice, and a live
 * region whose text does not change announces nothing. Each message therefore
 * carries a monotonic id, and `LiveRegion` appends a zero-width space on odd
 * ids — visually and audibly nothing, but a different string, so the second
 * mark is spoken too.
 */

interface Announcement {
  id: number;
  message: string;
}

let current: Announcement = { id: 0, message: "" };
const listeners = new Set<() => void>();

/** Speaks `message` politely. Safe to call from an event handler or a promise. */
export function announce(message: string) {
  current = { id: current.id + 1, message };
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

const SERVER_SNAPSHOT: Announcement = { id: 0, message: "" };

/** Subscribes to the current announcement. Only `LiveRegion` needs this. */
export function useAnnouncement(): Announcement {
  return useSyncExternalStore(subscribe, () => current, () => SERVER_SNAPSHOT);
}
