"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChevronsUp, Magnifier, Xmark } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useWorkspaceStore, useWorkspaceSelection } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";
import { NoteItem } from "./NoteItem";
import type { NoteUpdates } from "./NoteDetailsModal";

type NoteEntry = Note & { workspaceId: string };

/** Above this many notes the list gets a client-side filter box. */
const FILTER_THRESHOLD = 5;

/** Pinned first, then newest first. */
function compareNotes(a: NoteEntry, b: NoteEntry) {
  const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
  if (pinDiff !== 0) return pinDiff;
  return b.createdAt.localeCompare(a.createdAt);
}

export function NoteList() {
  const { getWorkspaceRepos } = useRepositoryContext();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selection = useWorkspaceSelection();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
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

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopedNotes;
    return scopedNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    );
  }, [scopedNotes, query]);

  if (scopedNotes.length === 0) return null;

  const showFilter = scopedNotes.length > FILTER_THRESHOLD;

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
          className={`shrink-0 text-foreground/40 transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
        />
        <p className="text-xs font-semibold tracking-wide text-foreground/40 uppercase">
          Notes
        </p>
        <p className="text-xs text-foreground/30">{scopedNotes.length}</p>
      </button>

      <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
        <div className="flex flex-col gap-0.5 pt-1">
          {showFilter && (
            <div className="relative pb-1">
              <Magnifier
                width={14}
                height={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground/30"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter notes"
                aria-label="Filter notes"
                className="h-11 w-full rounded-lg border border-foreground/10 bg-background pr-11 pl-9 text-base text-foreground placeholder:text-foreground/30 focus:border-foreground/30 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear filter"
                  className="absolute top-1/2 right-0 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center text-foreground/40 hover:text-foreground/70"
                >
                  <Xmark width={14} height={14} />
                </button>
              )}
            </div>
          )}

          {visibleNotes.length === 0 ? (
            <p className="px-3 py-2 text-sm text-foreground/40">No notes match “{query.trim()}”.</p>
          ) : (
            visibleNotes.map((note) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
