"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChevronsUp } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useWorkspaceStore, useWorkspaceSelection } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";
import { NoteItem } from "./NoteItem";
import type { NoteUpdates } from "./NoteDetailsModal";

type NoteEntry = Note & { workspaceId: string };

/** Pinned first, then newest first. */
function compareNotes(a: NoteEntry, b: NoteEntry) {
  const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
  if (pinDiff !== 0) return pinDiff;
  return b.createdAt.localeCompare(a.createdAt);
}

/**
 * @deprecated Legacy pre-routing notes section. Nothing imports it; `/app/notes`
 * is the notes surface now.
 *
 * WS11 removed what it was named for in this file: the hand-rolled `<input>`
 * that appeared only once a workspace had more than five notes, with different
 * styling and a different scope from the toolbar `SearchBox`. A filter is never
 * threshold-gated (DIRECTION §4), and notes are filtered by the one field in
 * the shell header.
 *
 * TODO(WS7/WS15): delete this file.
 */
export function NoteList() {
  const { getWorkspaceRepos } = useRepositoryContext();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selection = useWorkspaceSelection();
  const [collapsed, setCollapsed] = useState(false);
  const [notes, setNotes] = useState<NoteEntry[]>([]);

  // Stable key so new `workspaces` array identities don't resubscribe everything.
  const workspaceKey = selection.workspaceIds.join(",");

  useEffect(() => {
    const ids = workspaceKey ? workspaceKey.split(",") : [];
    const notesPerWorkspace = new Map<string, NoteEntry[]>();
    const unsubs: (() => void)[] = [];

    for (const wsId of ids) {
      const repos = getWorkspaceRepos(wsId);
      if (!repos) continue;
      unsubs.push(
        repos.note.subscribeNotes((wsNotes) => {
          notesPerWorkspace.set(
            wsId,
            wsNotes.map((n) => ({ ...n, workspaceId: wsId })),
          );
          setNotes([...notesPerWorkspace.values()].flat().sort(compareNotes));
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [workspaceKey, getWorkspaceRepos]);

  function tryLogActivity(
    type: "note_added" | "note_edited" | "note_deleted",
    wsId: string,
    noteId: string,
    noteTitle: string,
  ) {
    const user = auth.currentUser;
    if (!user) return;
    const workspace = workspaces.find((w) => w.id === wsId);
    if (!workspace || workspace.members.length < 2) return;
    workspaceRepository
      .logActivity(wsId, {
        type,
        actorUid: user.uid,
        actorDisplayName: user.displayName ?? "User",
        itemId: noteId,
        itemName: noteTitle,
      })
      .catch(() => {
        /* non-critical */
      });
  }

  /** Optimistic; rejects so the caller can surface the failure. */
  async function handleUpdate(noteId: string, updates: NoteUpdates) {
    const entry = notes.find((n) => n.id === noteId);
    if (!entry) return;
    const repos = getWorkspaceRepos(entry.workspaceId);
    if (!repos) throw new Error("Workspace unavailable");

    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n)).sort(compareNotes),
    );

    try {
      await repos.note.updateNote(noteId, updates);
    } catch (err) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? entry : n)).sort(compareNotes),
      );
      throw err;
    }

    if (updates.title !== undefined || updates.body !== undefined) {
      tryLogActivity("note_edited", entry.workspaceId, noteId, updates.title ?? entry.title);
    }
  }

  function handleDelete(noteId: string) {
    const entry = notes.find((n) => n.id === noteId);
    if (!entry) return;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    const repos = getWorkspaceRepos(entry.workspaceId);
    repos?.note
      .deleteNote(noteId)
      .then(() => tryLogActivity("note_deleted", entry.workspaceId, noteId, entry.title))
      .catch(() => {
        setNotes((prev) => [...prev, entry].sort(compareNotes));
        toast.error("Failed to delete note. Please try again.");
      });
  }

  // Notes of workspaces that just left the selection stay in state until their
  // subscription is replaced, so scope the render by the live selection.
  const scopedNotes = useMemo(() => {
    const ids = new Set(selection.workspaceIds);
    return notes.filter((n) => ids.has(n.workspaceId));
  }, [notes, selection.workspaceIds]);

  if (scopedNotes.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
        className="flex min-h-11 w-full cursor-pointer items-center gap-1.5 pb-1 text-left select-none sm:min-h-0"
      >
        <ChevronsUp
          width={12}
          height={12}
          className={`shrink-0 text-subtle transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
        />
        <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
          Notes
        </p>
        <p className="text-xs text-subtle">{scopedNotes.length}</p>
      </button>

      <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
        <div className="flex flex-col gap-0.5 pt-1">
          {scopedNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              workspaceName={
                selection.isSingle
                  ? undefined
                  : workspaces.find((w) => w.id === note.workspaceId)?.name
              }
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
