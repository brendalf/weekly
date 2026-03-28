"use client";

import { useState, useEffect, useMemo } from "react";
import type { Note } from "@weekly/domain";
import { weekKeyOf } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useCalendarStore } from "../../stores/calendar";
import { useWorkspaceStore } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";
import { NoteItem } from "./NoteItem";
import { SectionHeader } from "../general/SectionHeader";

type NoteEntry = Note & { workspaceId: string };

export function NoteList() {
  const { activeRepos, getWorkspaceRepos } = useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [collapsed, setCollapsed] = useState(false);

  const weekKey = useMemo(() => {
    const date = selectedDayISO ? new Date(selectedDayISO) : new Date();
    return weekKeyOf(date);
  }, [selectedDayISO]);

  const [notes, setNotes] = useState<NoteEntry[]>([]);

  // Single-workspace mode
  useEffect(() => {
    if (activeWorkspaceId === null || !activeRepos) return;
    const wsId = activeWorkspaceId;
    return activeRepos.note.subscribeNotes(weekKey, (wkNotes) => {
      setNotes(wkNotes.map((n) => ({ ...n, workspaceId: wsId })));
    });
  }, [activeWorkspaceId, activeRepos, weekKey]);

  // All-workspaces mode
  useEffect(() => {
    if (activeWorkspaceId !== null || workspaces.length === 0) return;

    const notesPerWorkspace = new Map<string, NoteEntry[]>();
    const unsubs: (() => void)[] = [];

    for (const ws of workspaces) {
      const repos = getWorkspaceRepos(ws.id);
      if (!repos) continue;
      const wsId = ws.id;
      unsubs.push(
        repos.note.subscribeNotes(weekKey, (wkNotes) => {
          notesPerWorkspace.set(
            wsId,
            wkNotes.map((n) => ({ ...n, workspaceId: wsId })),
          );
          const all = [...notesPerWorkspace.values()].flat();
          all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          setNotes(all);
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [activeWorkspaceId, workspaces, weekKey, getWorkspaceRepos]);

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
        weekKey,
      })
      .catch(() => {
        /* non-critical */
      });
  }

  function getRepos(wsId: string) {
    return wsId === activeWorkspaceId ? activeRepos : getWorkspaceRepos(wsId);
  }

  async function handleUpdate(
    wk: string,
    noteId: string,
    title: string,
    body: string,
  ) {
    const entry = notes.find((n) => n.id === noteId);
    if (!entry) return;
    const repos = getRepos(entry.workspaceId);
    if (!repos) return;
    await repos.note.updateNote(wk, noteId, title, body);
    tryLogActivity("note_edited", entry.workspaceId, noteId, title);
  }

  async function handleDelete(wk: string, noteId: string) {
    const entry = notes.find((n) => n.id === noteId);
    if (!entry) return;
    const repos = getRepos(entry.workspaceId);
    if (!repos) return;
    await repos.note.deleteNote(wk, noteId);
    tryLogActivity("note_deleted", entry.workspaceId, noteId, entry.title);
  }

  if (notes.length === 0) return null;

  return (
    <div>
      <SectionHeader
        label="Notes"
        collapsed={collapsed}
        done={0}
        total={0}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
        <div className="flex flex-col gap-0.5 pt-1">
          {notes.map((note) => {
            const wsName =
              activeWorkspaceId === null
                ? workspaces.find((w) => w.id === note.workspaceId)?.name
                : undefined;
            return (
              <NoteItem
                key={note.id}
                note={note}
                weekKey={weekKey}
                workspaceName={wsName}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
