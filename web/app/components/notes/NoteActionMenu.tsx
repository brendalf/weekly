"use client";

import type { Note } from "@weekly/domain";
import { Copy, Pencil, Pin, PinFill, TrashBin } from "@gravity-ui/icons";
import { toast } from "sonner";
import { ActionMenu } from "../ui";
import type { ActionMenuEntry } from "../ui";
import { rowControl } from "../../hooks/useRowKeys";
import { useAppData } from "../shell/AppDataProvider";
import { useNoteDelete } from "./useNoteDelete";
import type { NoteUpdates } from "./NoteDetailsModal";

/**
 * The note row's `⋯` (PLAN WS10 / DIRECTION §7).
 *
 * Pin was the only thing a note row could do; edit and delete required the
 * detail view. The pin toggle stays as a one-press control on the row —
 * icon-only is explicitly allowed for it (DIRECTION §6.7) — and everything
 * else lives here.
 *
 * Delete is reversible rather than confirmed, which **inverts** the old
 * behavior: notes were the one object in the app that asked twice, while
 * habits destroyed their entire history without asking at all. See
 * `useUndoableDelete` for the limits of the undo.
 */

export interface NoteActionMenuProps {
  note: Note;
  /** Workspace the note belongs to — a duplicate must land in the same one. */
  workspaceId?: string;
  /** Opens the note's detail view in edit mode. */
  onEdit: () => void;
  onUpdate: (noteId: string, updates: NoteUpdates) => Promise<void>;
  onDelete: (noteId: string) => void | Promise<void>;
}

export function NoteActionMenu({
  note,
  workspaceId,
  onEdit,
  onUpdate,
  onDelete,
}: NoteActionMenuProps) {
  const { addNote } = useAppData();
  const deleteNoteWithUndo = useNoteDelete();

  function togglePin() {
    onUpdate(note.id, { pinned: !note.pinned }).catch(() => {
      toast.error("Failed to update note. Please try again.");
    });
  }

  function duplicate() {
    addNote(`${note.title} (copy)`, note.body, workspaceId)
      .then(() => toast.success("Note duplicated"))
      .catch(() => toast.error("Failed to duplicate note. Please try again."));
  }

  function remove() {
    deleteNoteWithUndo({ note, workspaceId, onDelete, onUpdate });
  }

  const items: ActionMenuEntry[] = [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil width={16} height={16} />,
      onAction: onEdit,
    },
    {
      key: "pin",
      label: note.pinned ? "Unpin" : "Pin",
      icon: note.pinned ? (
        <PinFill width={16} height={16} />
      ) : (
        <Pin width={16} height={16} />
      ),
      onAction: togglePin,
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy width={16} height={16} />,
      onAction: duplicate,
    },
    { kind: "separator", key: "sep" },
    {
      key: "delete",
      label: "Delete",
      icon: <TrashBin width={16} height={16} />,
      danger: true,
      onAction: remove,
    },
  ];

  return (
    <ActionMenu
      label={`Actions for ${note.title}`}
      items={items}
      triggerClassName={rowControl}
      popoverClassName="w-52"
    />
  );
}
