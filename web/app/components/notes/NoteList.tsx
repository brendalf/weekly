"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/react";
import { Plus } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";
import { weekKeyOf } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useCalendarStore } from "../../stores/calendar";
import { useWorkspaceStore } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";
import { NoteItem } from "./NoteItem";
import { NoteAddModal } from "./NoteAddModal";

export function NoteList() {
  const { activeRepos } = useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const weekKey = useMemo(() => {
    const date = selectedDayISO ? new Date(selectedDayISO) : new Date();
    return weekKeyOf(date);
  }, [selectedDayISO]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!activeRepos) return;
    return activeRepos.note.subscribeNotes(weekKey, setNotes);
  }, [activeRepos, weekKey]);

  function tryLogActivity(
    type: "note_added" | "note_edited" | "note_deleted",
    noteId: string,
    noteTitle: string,
  ) {
    const user = auth.currentUser;
    if (!user || !activeWorkspaceId) return;
    const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!workspace || workspace.members.length < 2) return;
    workspaceRepository
      .logActivity(activeWorkspaceId, {
        type,
        actorUid: user.uid,
        actorDisplayName: user.displayName ?? "User",
        itemId: noteId,
        itemName: noteTitle,
        weekKey,
      })
      .catch(() => {/* non-critical */});
  }

  async function handleAdd(noteId: string, noteTitle: string) {
    tryLogActivity("note_added", noteId, noteTitle);
  }

  async function handleUpdate(wk: string, noteId: string, title: string, body: string) {
    if (!activeRepos) return;
    await activeRepos.note.updateNote(wk, noteId, title, body);
    tryLogActivity("note_edited", noteId, title);
  }

  async function handleDelete(wk: string, noteId: string) {
    if (!activeRepos) return;
    const note = notes.find((n) => n.id === noteId);
    await activeRepos.note.deleteNote(wk, noteId);
    if (note) tryLogActivity("note_deleted", noteId, note.title);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-0.5 pt-1">
        {notes.length === 0 && (
          <p className="text-xs text-foreground/60 pt-2">No notes yet.</p>
        )}
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            weekKey={weekKey}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {activeRepos && (
        <>
          <div className="pt-1">
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label="Add note"
              onPress={() => setAddOpen(true)}
            >
              <Plus />
            </Button>
          </div>
          <NoteAddModal
            weekKey={weekKey}
            noteRepo={activeRepos.note}
            open={addOpen}
            onOpenChange={setAddOpen}
            onAdded={handleAdd}
          />
        </>
      )}
    </div>
  );
}
