"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, PinFill } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";
import { Badge } from "../general/Badge";
import { NoteActionMenu } from "./NoteActionMenu";
import { NoteDetailsModal } from "./NoteDetailsModal";
import type { NoteUpdates } from "./NoteDetailsModal";
import { ROW_ATTR, rowControl, rowLink, rowShell } from "../../hooks/useRowKeys";
import { touchTarget } from "../ui";

interface NoteItemProps {
  note: Note;
  workspaceName?: string;
  /**
   * Workspace the note lives in. Only needed so Duplicate lands in the same
   * one; without it a duplicate goes to the workspace currently in view.
   */
  workspaceId?: string;
  onUpdate: (noteId: string, updates: NoteUpdates) => Promise<void>;
  onDelete: (noteId: string) => void | Promise<void>;
  /**
   * Route for this note's detail panel (`/app/notes/:id`). When set the row is
   * a real link and the legacy `NoteDetailsModal` is not rendered — the panel
   * route owns the detail (DIRECTION §5).
   */
  detailHref?: string;
}

/**
 * `⋯ → Edit` has to land *in* the edit form, not next to it, so the intent
 * rides the URL: `/app/notes/:id?edit=1`. That keeps the panel's state in the
 * one place that already drives it (the route), so Back closes the form and a
 * pasted link opens it — which a `useState` in the row could not do.
 */
export function noteEditHref(detailHref: string): string {
  return `${detailHref}${detailHref.includes("?") ? "&" : "?"}edit=1`;
}

function formatShortDate(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

/**
 * A note row (PLAN WS10 + WS12).
 *
 * The row keeps its pin toggle — one press for the only action a note has
 * that is worth a dedicated control — and gains the `⋯` for Edit, Pin/Unpin,
 * Duplicate and Delete. It uses the same stretched-link shell as the habit
 * and task rows (`hooks/useRowKeys`), so `Tab`, `Enter` and `j`/`k` behave
 * identically across all three object types. There is nothing to toggle with
 * `x`, so the row does not claim that key.
 */
export function NoteItem({
  note,
  workspaceName,
  workspaceId,
  onUpdate,
  onDelete,
  detailHref,
}: NoteItemProps) {
  const router = useRouter();
  const [detail, setDetail] = useState({ open: false, editing: false });

  function handleTogglePin() {
    onUpdate(note.id, { pinned: !note.pinned }).catch(() => {
      toast.error("Failed to update note. Please try again.");
    });
  }

  function openDetail(editing: boolean) {
    if (detailHref) {
      router.push(editing ? noteEditHref(detailHref) : detailHref);
      return;
    }
    setDetail({ open: true, editing });
  }

  const formattedDate = formatShortDate(note.createdAt);
  const rowContent = (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        {note.pinned && (
          <PinFill
            width={12}
            height={12}
            className="shrink-0 text-highlight"
            aria-hidden
          />
        )}
        <span className="truncate text-sm font-medium text-foreground">
          {note.title}
        </span>
      </span>
      {note.body && (
        <span className="line-clamp-1 text-xs break-words whitespace-pre-wrap text-subtle">
          {note.body}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle">
        {workspaceName && (
          <Badge className="bg-fill-strong text-subtle">{workspaceName}</Badge>
        )}
        <span className="hidden sm:inline">{note.authorDisplayName}</span>
        {formattedDate && <span className="text-subtle">{formattedDate}</span>}
      </span>
    </>
  );

  const linkClassName = `${rowLink} flex min-h-11 flex-col justify-center gap-0.5 px-3 py-2`;

  return (
    <>
      <div className={`${rowShell} items-stretch pr-1`}>
        {detailHref ? (
          <Link
            href={detailHref}
            className={linkClassName}
            {...{ [ROW_ATTR]: "note" }}
          >
            {rowContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openDetail(false)}
            className={linkClassName}
            {...{ [ROW_ATTR]: "note" }}
          >
            {rowContent}
          </button>
        )}

        <button
          type="button"
          onClick={handleTogglePin}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          aria-pressed={Boolean(note.pinned)}
          className={[
            "flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors",
            touchTarget,
            rowControl,
            note.pinned ? "text-highlight" : "text-subtle hover:text-muted",
          ].join(" ")}
        >
          {note.pinned ? (
            <PinFill width={16} height={16} />
          ) : (
            <Pin width={16} height={16} />
          )}
        </button>

        <NoteActionMenu
          note={note}
          workspaceId={workspaceId}
          onEdit={() => openDetail(true)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>

      {!detailHref && (
        // Remounting on the edit flag lets the modal take it as initial state
        // instead of syncing a prop into state from an effect.
        <NoteDetailsModal
          key={detail.editing ? "edit" : "view"}
          open={detail.open}
          defaultEditing={detail.editing}
          onOpenChange={(open) => setDetail((d) => ({ ...d, open }))}
          note={note}
          workspaceName={workspaceName}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
