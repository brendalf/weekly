"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { toast } from "sonner";
import {
  Modal,
  Button,
  Input,
  Label,
  TextField,
  Surface,
  useOverlayState,
} from "@heroui/react";
import { Pencil, TrashBin, Xmark, Check, Pin, PinFill } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";
import { Badge } from "../general/Badge";
import { useIsTouch } from "../../hooks/useIsTouch";
import { useNoteDelete } from "./useNoteDelete";

/** Partial note mutation, mirroring `NoteRepository.updateNote`. */
export interface NoteUpdates {
  title?: string;
  body?: string;
  pinned?: boolean;
}

interface NoteDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note;
  workspaceName?: string;
  /** Workspace to restore into if the delete is undone. */
  workspaceId?: string;
  onUpdate: (noteId: string, updates: NoteUpdates) => Promise<void>;
  onDelete: (noteId: string) => void | Promise<void>;
  /**
   * Open straight into the edit form — the row's `⋯` → Edit. Read once, as
   * initial state: `NoteItem` remounts the modal when the flag changes rather
   * than syncing a prop into state from an effect.
   */
  defaultEditing?: boolean;
}

function formatTimestamp(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The legacy note detail (WS7 is moving this into `/app/notes/:id`).
 *
 * WS12 inverted its delete. Notes were the one object that asked twice before
 * deleting — while habits, which lose their entire history, asked nothing at
 * all. Confirmation moved to habits; the note deletes immediately and the
 * toast offers `Undo` (DIRECTION §7).
 */
export function NoteDetailsModal({
  open,
  onOpenChange,
  note,
  workspaceName,
  workspaceId,
  onUpdate,
  onDelete,
  defaultEditing = false,
}: NoteDetailsModalProps) {
  const isTouch = useIsTouch();
  const deleteNoteWithUndo = useNoteDelete();
  const [editing, setEditing] = useState(defaultEditing);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editBody, setEditBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) setEditing(false);
      onOpenChange(isOpen);
    },
  });

  // Auto-grow the body textarea instead of a fixed `rows` box.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !editing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editBody, editing]);

  function startEditing() {
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditTitle(note.title);
    setEditBody(note.body);
  }

  async function handleSave() {
    const title = editTitle.trim();
    if (!title || saving) return;
    const body = editBody.trim();
    if (title === note.title && body === note.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(note.id, { title, body });
      setEditing(false);
    } catch {
      toast.error("Failed to save note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleTogglePin() {
    onUpdate(note.id, { pinned: !note.pinned }).catch(() => {
      toast.error("Failed to update note. Please try again.");
    });
  }

  function handleDelete() {
    state.close();
    deleteNoteWithUndo({ note, workspaceId, onDelete, onUpdate });
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
      return;
    }
    if (e.key === "Escape") {
      // Leave edit mode rather than closing the whole modal.
      e.preventDefault();
      e.stopPropagation();
      cancelEditing();
    }
  }

  const isEditValid = Boolean(editTitle.trim());
  const createdLabel = formatTimestamp(note.createdAt);
  const updatedLabel = formatTimestamp(note.updatedAt);
  const showUpdated = Boolean(updatedLabel) && updatedLabel !== createdLabel;

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container
          placement="bottom"
          size="sm"
          className="p-0 sm:p-10"
        >
          <Modal.Dialog
            className="h-full max-h-full rounded-b-none rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[85dvh] sm:rounded-3xl sm:p-6 sm:pb-6"
          >
            <Modal.CloseTrigger />
            <Modal.Header>
              {editing ? (
                <Modal.Heading className="pr-10">Edit note</Modal.Heading>
              ) : (
                <Modal.Heading className="pr-10 break-words">
                  <span className="inline-flex items-start gap-1.5">
                    {note.pinned && (
                      <PinFill
                        width={14}
                        height={14}
                        className="mt-0.5 shrink-0 text-highlight"
                        aria-label="Pinned"
                      />
                    )}
                    <span className="break-words">{note.title}</span>
                  </span>
                </Modal.Heading>
              )}
            </Modal.Header>

            <Modal.Body className="p-1">
              <Surface variant="default">
                {editing ? (
                  <div
                    className="flex flex-col gap-3"
                    onKeyDown={handleEditKeyDown}
                  >
                    <TextField name="noteTitle">
                      <Label>Title</Label>
                      <Input
                        value={editTitle}
                        variant="secondary"
                        placeholder="Note title"
                        autoFocus={!isTouch}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </TextField>
                    <div className="flex flex-col gap-1">
                      <Label>Body</Label>
                      <textarea
                        ref={bodyRef}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder="Write something…"
                        rows={4}
                        className="max-h-[45vh] min-h-28 w-full resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-subtle">
                      {isTouch ? "Tap the check to save." : "⌘/Ctrl + Enter to save · Esc to cancel"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {workspaceName && (
                      <span className="w-fit">
                        <Badge className="bg-fill-strong text-subtle">
                          {workspaceName}
                        </Badge>
                      </span>
                    )}
                    {note.body ? (
                      <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                        {note.body}
                      </p>
                    ) : (
                      <p className="text-sm text-subtle">No content yet.</p>
                    )}
                    <div className="flex flex-col gap-0.5 border-t border-border pt-3">
                      <p className="text-xs break-words text-subtle">
                        By {note.authorDisplayName}
                      </p>
                      {createdLabel && (
                        <p className="text-xs text-subtle">Created {createdLabel}</p>
                      )}
                      {showUpdated && (
                        <p className="text-xs text-subtle">Edited {updatedLabel}</p>
                      )}
                    </div>
                  </div>
                )}
              </Surface>
            </Modal.Body>

            <Modal.Footer className="flex-wrap">
              {editing ? (
                <>
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    aria-label="Cancel editing"
                    onPress={cancelEditing}
                  >
                    <Xmark />
                  </Button>
                  <Button
                    className="min-h-11 bg-brand"
                    isDisabled={!isEditValid || saving}
                    aria-label="Save note"
                    onPress={handleSave}
                  >
                    <Check />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                    onPress={handleTogglePin}
                  >
                    {note.pinned ? <PinFill /> : <Pin />}
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    onPress={startEditing}
                  >
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="min-h-11"
                    onPress={handleDelete}
                  >
                    <TrashBin />
                    Delete note
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
