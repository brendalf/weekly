"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pin, PinFill } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";
import { Badge } from "../general/Badge";
import { NoteDetailsModal } from "./NoteDetailsModal";
import type { NoteUpdates } from "./NoteDetailsModal";

interface NoteItemProps {
  note: Note;
  workspaceName?: string;
  onUpdate: (noteId: string, updates: NoteUpdates) => Promise<void>;
  onDelete: (noteId: string) => void;
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

export function NoteItem({ note, workspaceName, onUpdate, onDelete }: NoteItemProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  function handleTogglePin() {
    onUpdate(note.id, { pinned: !note.pinned }).catch(() => {
      toast.error("Failed to update note. Please try again.");
    });
  }

  const formattedDate = formatShortDate(note.createdAt);

  return (
    <>
      <div className="flex items-stretch rounded-lg border border-foreground/10 bg-background transition-colors hover:border-foreground/20">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 px-3 py-2 text-left"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {note.pinned && (
              <PinFill
                width={12}
                height={12}
                className="shrink-0 text-amber-500"
                aria-label="Pinned"
              />
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {note.title}
            </span>
          </span>
          {note.body && (
            <span className="line-clamp-1 text-xs break-words whitespace-pre-wrap text-foreground/50">
              {note.body}
            </span>
          )}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/40">
            {workspaceName && (
              <Badge className="bg-foreground/10 text-foreground/50">{workspaceName}</Badge>
            )}
            <span className="hidden sm:inline">{note.authorDisplayName}</span>
            {formattedDate && <span className="text-foreground/30">{formattedDate}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={handleTogglePin}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          className={`flex w-11 shrink-0 cursor-pointer items-center justify-center ${
            note.pinned
              ? "text-amber-500"
              : "text-foreground/25 hover:text-foreground/60"
          }`}
        >
          {note.pinned ? <PinFill width={16} height={16} /> : <Pin width={16} height={16} />}
        </button>
      </div>

      <NoteDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        note={note}
        workspaceName={workspaceName}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  );
}
