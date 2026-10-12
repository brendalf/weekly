"use client";

import { useCallback } from "react";
import type { Note } from "@weekly/domain";
import { useAppData } from "../shell/AppDataProvider";
import { useUndoableDelete } from "../../hooks/useUndoableDelete";
import type { NoteUpdates } from "./NoteDetailsModal";

/**
 * Deleting a note, reversibly — shared by the row `⋯` and the detail view so
 * the two cannot drift (PLAN WS12 / DIRECTION §7).
 *
 * Notes used to be the *only* object in the app that asked before deleting,
 * while habits destroyed their whole history silently. That is inverted now:
 * habits confirm, notes offer `Undo`.
 *
 * Undo re-creates the note through `addNote` and re-pins it if it was pinned.
 * The body and title come back; the id, author and timestamps are new. See
 * `useUndoableDelete`.
 */
export interface NoteDeleteOptions {
  note: Note;
  /** Workspace to restore into. Defaults to the workspace in view. */
  workspaceId?: string;
  onDelete: (noteId: string) => void | Promise<void>;
  onUpdate: (noteId: string, updates: NoteUpdates) => Promise<void>;
  /** Runs once the delete lands — close the panel the note was shown in. */
  onDeleted?: () => void;
}

export function useNoteDelete() {
  const { addNote } = useAppData();
  const deleteWithUndo = useUndoableDelete();

  return useCallback(
    ({ note, workspaceId, onDelete, onUpdate, onDeleted }: NoteDeleteOptions) => {
      deleteWithUndo({
        message: "Note deleted",
        errorMessage: "Failed to delete note. Please try again.",
        onDeleted,
        remove: async () => {
          await onDelete(note.id);
        },
        restore: async () => {
          const newId = await addNote(note.title, note.body, workspaceId);
          if (newId && note.pinned) await onUpdate(newId, { pinned: true });
        },
      });
    },
    [addNote, deleteWithUndo],
  );
}
