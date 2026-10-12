"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Pin, PinFill } from "@gravity-ui/icons";
import {
  ConfirmButton,
  DetailPanel,
  EmptyState,
  SkeletonList,
} from "../../../components/ui";
import { Badge } from "../../../components/general/Badge";
import { useAppData } from "../../../components/shell/AppDataProvider";
import { useIsTouch } from "../../../hooks/useIsTouch";
import { useWorkspaceSelection } from "../../../stores/workspace";

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
 * `/app/notes/:id` — **the reference implementation of the detail-panel route**
 * (DIRECTION §5). `/app/habits/:id` and `/app/tasks/:id` share its shape and
 * still have the per-route bodies WS5/WS6 owe them.
 *
 * The pattern, end to end:
 *
 * 1. the section's `layout.tsx` renders the list and this page as its child, so
 *    the panel opens beside a list that never unmounts;
 * 2. the id comes from `useParams()`, the item from `useAppData()` — the panel
 *    never subscribes to anything itself;
 * 3. closing routes back to the index with `router.push`, which makes `Esc`,
 *    the close button, an outside click, and the browser Back button all do the
 *    same thing;
 * 4. destructive actions use `ConfirmButton` inline — never a modal inside a
 *    modal;
 * 5. while the item has not arrived yet the body is a skeleton, and once the
 *    data is in and the id still matches nothing, it says so and offers the way
 *    back.
 */
export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { notes, workspaces, workspacesLoaded, updateNote, deleteNote } =
    useAppData();
  const selection = useWorkspaceSelection();
  const isTouch = useIsTouch();

  const note = notes.find((n) => n.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the body textarea instead of a fixed `rows` box.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !editing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editBody, editing]);

  function close() {
    router.push("/app/notes");
  }

  function startEditing() {
    if (!note) return;
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function handleSave() {
    if (!note || saving) return;
    const title = editTitle.trim();
    if (!title) return;
    const body = editBody.trim();
    if (title === note.title && body === note.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateNote(note.id, { title, body });
      setEditing(false);
    } catch {
      toast.error("Failed to save note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleTogglePin() {
    if (!note) return;
    updateNote(note.id, { pinned: !note.pinned }).catch(() => {
      toast.error("Failed to update note. Please try again.");
    });
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSave();
      return;
    }
    if (event.key === "Escape") {
      // Leave edit mode rather than closing the whole panel.
      event.preventDefault();
      event.stopPropagation();
      cancelEditing();
    }
  }

  const workspaceName =
    note && !selection.isSingle
      ? workspaces.find((w) => w.id === note.workspaceId)?.name
      : undefined;
  const createdLabel = note ? formatTimestamp(note.createdAt) : "";
  const updatedLabel = note ? formatTimestamp(note.updatedAt) : "";
  const showUpdated = Boolean(updatedLabel) && updatedLabel !== createdLabel;

  return (
    <DetailPanel
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={editing ? "Edit note" : (note?.title ?? "Note")}
      ariaLabel="Note details"
      footer={
        note &&
        (editing ? (
          <>
            <Button
              variant="ghost"
              className="min-h-11"
              onPress={cancelEditing}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11 bg-brand"
              isDisabled={!editTitle.trim() || saving}
              onPress={handleSave}
            >
              Save note
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              className="mr-auto min-h-11"
              onPress={handleTogglePin}
            >
              {note.pinned ? (
                <PinFill width={16} height={16} />
              ) : (
                <Pin width={16} height={16} />
              )}
              {note.pinned ? "Unpin" : "Pin"}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onPress={startEditing}
            >
              Edit
            </Button>
            <ConfirmButton
              label="Delete note"
              confirmLabel="Delete note"
              variant="ghost"
              onConfirm={() => {
                deleteNote(note.id);
                close();
              }}
            />
          </>
        ))
      }
    >
      {!note ? (
        workspacesLoaded ? (
          <EmptyState
            headline="This note is gone"
            body="It was deleted, or it lives in a workspace that is not in view."
            action={
              <Button variant="outline" className="min-h-11" onPress={close}>
                Back to notes
              </Button>
            }
          />
        ) : (
          <SkeletonList count={3} variant="note" label="Loading note" />
        )
      ) : editing ? (
        <div className="flex flex-col gap-3" onKeyDown={handleEditKeyDown}>
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
              rows={6}
              className="max-h-[45vh] min-h-28 w-full resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
            />
          </div>
          <p className="text-xs text-subtle">
            {isTouch
              ? "Tap Save note when you are done."
              : "⌘/Ctrl + Enter to save · Esc to cancel"}
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
            <p className="text-sm break-words whitespace-pre-wrap text-foreground">
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
    </DetailPanel>
  );
}
