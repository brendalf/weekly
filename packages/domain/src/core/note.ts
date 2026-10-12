import type { Note } from "../models/note";

/**
 * Note sort order: pinned first, then newest first.
 *
 * Notes are "measured by findability" (DIRECTION §1), so the only ordering the
 * product promises is that a pin wins and recency breaks the tie.
 */
export function compareNotes(a: Note, b: Note): number {
  const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
  if (pinDiff !== 0) return pinDiff;
  return b.createdAt.localeCompare(a.createdAt);
}

/** `notes` sorted by {@link compareNotes}, without mutating the input. */
export function sortNotes<T extends Note>(notes: T[]): T[] {
  return [...notes].sort(compareNotes);
}
