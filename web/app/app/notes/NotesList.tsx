"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { FileText, Plus } from "@gravity-ui/icons";
import { toast } from "sonner";
import { EmptyState } from "../../components/ui";
import { NoteAddModal } from "../../components/notes/NoteAddModal";
import { NoteItem } from "../../components/notes/NoteItem";
import { useAppData } from "../../components/shell/AppDataProvider";
import { useItemSearch } from "../../hooks/useItemSearch";
import { useWorkspaceSelection } from "../../stores/workspace";

/**
 * `/app/notes` — the workspace's shared scratchpad, pinned first then newest
 * (DIRECTION §3). Notes have no period and no week: they are context, which is
 * why they no longer appear on `/app/week`.
 *
 * Notes are filtered by the one filter in the shell header, on title **and**
 * body (WS11). The hand-rolled input that used to appear inside the old
 * `NoteList` once a workspace passed five notes is gone — a filter that
 * materializes at the sixth note teaches nobody anything (DIRECTION §4).
 *
 * WS7 owns the rest: the row `⋯` (Edit, Pin/Unpin, Duplicate, Delete) and
 * deleting the now-unreferenced legacy `components/notes/NoteList.tsx`.
 */
export function NotesList() {
  const {
    notes: allNotes,
    workspaces,
    pickerWorkspaces,
    addNote,
    updateNote,
    deleteNote,
  } = useAppData();
  // With no query in the header this is `allNotes`.
  const { notes, isActive: isFiltered, appliedQuery } = useItemSearch({
    notes: allNotes,
  });
  const selection = useWorkspaceSelection();
  const [addOpen, setAddOpen] = useState(false);

  const addButton = (
    <>
      <Button
        size="sm"
        variant="outline"
        className="min-h-11"
        onPress={() => setAddOpen(true)}
      >
        <Plus width={16} height={16} />
        Add note
      </Button>
      <NoteAddModal
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaces={pickerWorkspaces}
        onSubmit={(title, body, workspaceId) => {
          addNote(title, body, workspaceId).catch(() => {
            toast.error("Failed to save note. Please try again.");
          });
        }}
      />
    </>
  );

  // The genuinely empty workspace. A query that matches nothing says so below
  // instead of pitching notes to someone who already keeps them.
  if (allNotes.length === 0) {
    return (
      <EmptyState
        icon={<FileText width={20} height={20} />}
        headline="No notes yet"
        body="Notes hold the context your habits and tasks don't: a decision you made, a link you keep losing, the plan behind the plan. Everyone in the workspace sees them."
        action={addButton}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">{addButton}</div>

      {notes.length === 0 && (
        <p className="px-1 text-sm text-subtle">
          {isFiltered
            ? `No notes match “${appliedQuery.trim()}”.`
            : "No notes to show."}
        </p>
      )}

      <div className="flex flex-col gap-0.5">
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            detailHref={`/app/notes/${note.id}`}
            // The note's own workspace, not whichever is in view — otherwise a
            // duplicate lands in the wrong one.
            workspaceId={note.workspaceId}
            workspaceName={
              selection.isSingle
                ? undefined
                : workspaces.find((w) => w.id === note.workspaceId)?.name
            }
            onUpdate={updateNote}
            onDelete={deleteNote}
          />
        ))}
      </div>
    </div>
  );
}
