"use client";

import { useState } from "react";
import { Button, Input, TextField, Surface } from "@heroui/react";
import { Pencil, TrashBin, Xmark, Check } from "@gravity-ui/icons";
import type { Note } from "@weekly/domain";

interface NoteItemProps {
  note: Note;
  weekKey: string;
  onUpdate: (weekKey: string, noteId: string, title: string, body: string) => Promise<void>;
  onDelete: (weekKey: string, noteId: string) => Promise<void>;
}

export function NoteItem({ note, weekKey, onUpdate, onDelete }: NoteItemProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editBody, setEditBody] = useState(note.body);

  function startEditing() {
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditing(true);
    setCollapsed(false);
  }

  async function handleSave() {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;
    await onUpdate(weekKey, note.id, trimmedTitle, editBody.trim());
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
    setEditTitle(note.title);
    setEditBody(note.body);
  }

  const formattedDate = note.createdAt
    ? new Date(note.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  if (editing) {
    return (
      <Surface variant="default" className="flex flex-col gap-2">
        <TextField name="noteTitle">
          <Input
            value={editTitle}
            variant="secondary"
            placeholder="Title"
            autoFocus
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </TextField>
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          placeholder="Write something…"
          rows={4}
          className="w-full resize-none rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" isIconOnly onPress={handleCancel}>
            <Xmark />
          </Button>
          <Button size="sm" isDisabled={!editTitle.trim()} isIconOnly onPress={handleSave}>
            <Check />
          </Button>
        </div>
      </Surface>
    );
  }

  return (
    <div className="rounded-lg border border-foreground/10 bg-background">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
      >
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {note.title}
        </span>
        <span className="shrink-0 text-xs text-foreground/40">
          {note.authorDisplayName}
        </span>
        <span className="shrink-0 text-xs text-foreground/30">{formattedDate}</span>
      </button>

      <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
        <div className="px-3 pb-3 flex flex-col gap-2">
          {note.body && (
            <p className="whitespace-pre-wrap text-sm text-foreground/80">
              {note.body}
            </p>
          )}
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label="Edit note"
              onPress={startEditing}
              className="text-foreground/40 hover:text-foreground/70"
            >
              <Pencil />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              aria-label="Delete note"
              onPress={() => onDelete(weekKey, note.id)}
              className="text-foreground/30 hover:text-red-500"
            >
              <TrashBin />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
