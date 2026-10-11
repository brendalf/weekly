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
  onUpdate: (noteId: string, updates: NoteUpdates) => Promise<void>;
  onDelete: (noteId: string) => void;
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

export function NoteDetailsModal({
  open,
  onOpenChange,
  note,
  workspaceName,
  onUpdate,
  onDelete,
}: NoteDetailsModalProps) {
  const isTouch = useIsTouch();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editBody, setEditBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setEditing(false);
        setConfirmingDelete(false);
      }
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
    setConfirmingDelete(false);
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
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete(note.id);
    state.close();
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
                        className="mt-0.5 shrink-0 text-amber-500"
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
                        className="max-h-[45vh] min-h-28 w-full resize-none overflow-y-auto rounded-lg border border-foreground/10 bg-background px-3 py-2 text-base text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-foreground/40">
                      {isTouch ? "Tap the check to save." : "⌘/Ctrl + Enter to save · Esc to cancel"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {workspaceName && (
                      <span className="w-fit">
                        <Badge className="bg-foreground/10 text-foreground/50">
                          {workspaceName}
                        </Badge>
                      </span>
                    )}
                    {note.body ? (
                      <p className="text-sm whitespace-pre-wrap break-words text-foreground/80">
                        {note.body}
                      </p>
                    ) : (
                      <p className="text-sm text-foreground/30">No content yet.</p>
                    )}
                    <div className="flex flex-col gap-0.5 border-t border-foreground/10 pt-3">
                      <p className="text-xs break-words text-foreground/50">
                        By {note.authorDisplayName}
                      </p>
                      {createdLabel && (
                        <p className="text-xs text-foreground/50">Created {createdLabel}</p>
                      )}
                      {showUpdated && (
                        <p className="text-xs text-foreground/50">Edited {updatedLabel}</p>
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
                    className="min-h-11 bg-purple-500"
                    isDisabled={!isEditValid || saving}
                    aria-label="Save note"
                    onPress={handleSave}
                  >
                    <Check />
                  </Button>
                </>
              ) : confirmingDelete ? (
                <>
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    onPress={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="danger" className="min-h-11" onPress={handleDelete}>
                    Delete note
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
                    aria-label="Edit note"
                    onPress={startEditing}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="danger"
                    className="min-h-11"
                    aria-label="Delete note"
                    onPress={handleDelete}
                  >
                    <TrashBin />
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
