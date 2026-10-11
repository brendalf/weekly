"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Surface } from "@heroui/react";
import {
  ArrowUp,
  Check,
  Comment as CommentIcon,
  Pencil,
  TrashBin,
  Xmark,
} from "@gravity-ui/icons";
import { toast } from "sonner";
import type { Comment, CommentTarget } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useWorkspaceStore } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";

export interface CommentSectionProps {
  /** Which collection the comments hang off. */
  target: CommentTarget;
  /** Id of the habit or task being commented on. */
  itemId: string;
  /** Habit/task title — used as the activity notification label. */
  itemName: string;
  /** Workspace that owns the item, for activity logging. */
  workspaceId: string | null;
  /** Comments are only subscribed while this is true. */
  isOpen: boolean;
}

const MAX_TEXTAREA_HEIGHT = 200;

/** How much of a comment travels with its activity notification. */
const COMMENT_PREVIEW_LENGTH = 140;

function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function formatCommentDate(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function wasEdited(comment: Comment): boolean {
  const created = new Date(comment.createdAt).getTime();
  const updated = new Date(comment.updatedAt).getTime();
  return Number.isFinite(created) && Number.isFinite(updated)
    ? updated - created > 1000
    : false;
}

interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
}

/** Textarea that grows with its content — no fixed `rows` + `resize-none`. */
function AutoGrowTextarea({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  ariaLabel,
  autoFocus,
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSubmit();
        } else if (e.key === "Escape" && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
      className="min-h-11 w-full resize-none overflow-y-auto rounded-lg border border-foreground/15 bg-background px-3 py-2.5 text-base leading-snug text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
    />
  );
}

export function CommentSection({
  target,
  itemId,
  itemName,
  workspaceId,
  isOpen,
}: CommentSectionProps) {
  const { getHabitRepos, getTaskRepos } = useRepositoryContext();
  const repos = target === "habit" ? getHabitRepos(itemId) : getTaskRepos(itemId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const currentUid = auth.currentUser?.uid ?? null;

  // Subscribe only while the modal is open — a closed modal costs zero reads.
  useEffect(() => {
    if (!isOpen || !repos) {
      setComments([]);
      return;
    }
    const unsub = repos.comment.subscribeComments(target, itemId, setComments);
    return () => unsub();
  }, [isOpen, repos, target, itemId]);

  useEffect(() => {
    if (isOpen) return;
    setDraft("");
    setEditingId(null);
    setEditDraft("");
  }, [isOpen]);

  const logCommentActivity = useCallback(
    (body: string) => {
      if (!workspaceId) return;
      const workspace = workspaces.find((w) => w.id === workspaceId);
      const user = auth.currentUser;
      if (!user || !workspace || workspace.members.length < 2) return;
      workspaceRepository
        .logActivity(workspaceId, {
          type: "comment_added",
          actorUid: user.uid,
          actorDisplayName: user.displayName ?? "User",
          itemId,
          itemName,
          commentTarget: target,
          commentBody: truncate(body, COMMENT_PREVIEW_LENGTH),
        })
        .catch(() => {
          /* non-critical */
        });
    },
    [workspaceId, workspaces, itemId, itemName, target],
  );

  async function handleAdd() {
    const body = draft.trim();
    const user = auth.currentUser;
    if (!body || !repos || !user || sending) return;

    const authorDisplayName = user.displayName ?? "User";
    const optimisticId = `optimistic-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: Comment = {
      id: optimisticId,
      body,
      authorId: user.uid,
      authorDisplayName,
      createdAt: now,
      updatedAt: now,
    };

    setDraft("");
    setComments((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      await repos.comment.addComment(target, itemId, {
        body,
        authorId: user.uid,
        authorDisplayName,
      });
      logCommentActivity(body);
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setDraft(body);
      toast.error("Failed to add comment. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function startEditing(comment: Comment) {
    setEditingId(comment.id);
    setEditDraft(comment.body);
  }

  async function handleSaveEdit(comment: Comment) {
    const body = editDraft.trim();
    if (!repos || !body || body === comment.body) {
      setEditingId(null);
      return;
    }
    const previousBody = comment.body;
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? { ...c, body } : c)),
    );
    setEditingId(null);
    try {
      await repos.comment.updateComment(target, itemId, comment.id, body);
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, body: previousBody } : c)),
      );
      toast.error("Failed to update comment. Please try again.");
    }
  }

  function handleDelete(comment: Comment) {
    if (!repos) return;
    const index = comments.findIndex((c) => c.id === comment.id);
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    repos.comment.deleteComment(target, itemId, comment.id).catch(() => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        const next = [...prev];
        next.splice(index < 0 ? next.length : index, 0, comment);
        return next;
      });
      toast.error("Failed to delete comment. Please try again.");
    });
  }

  if (!repos) return null;

  return (
    <Surface variant="default" className="mb-3">
      <div className="mb-2 flex items-center gap-2">
        <CommentIcon className="h-4 w-4 text-foreground/40" />
        <p className="text-sm font-semibold text-foreground">Comments</p>
        {comments.length > 0 && (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground/50">
            {comments.length}
          </span>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="mb-3 text-xs text-foreground/40">No comments yet.</p>
      ) : (
        <div className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {comments.map((comment) => {
            const isOwn = Boolean(currentUid) && comment.authorId === currentUid;
            const isEditing = editingId === comment.id;
            return (
              <div
                key={comment.id}
                className="rounded-lg border border-foreground/10 bg-background p-3"
              >
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-foreground">
                    {comment.authorDisplayName || "User"}
                  </span>
                  <span className="text-[10px] text-foreground/40">
                    {formatCommentDate(comment.createdAt)}
                  </span>
                  {wasEdited(comment) && (
                    <span className="text-[10px] text-foreground/30">
                      edited
                    </span>
                  )}
                  {isOwn && !isEditing && (
                    <div className="ml-auto flex items-center">
                      <Button
                        isIconOnly
                        variant="ghost"
                        className="h-11 w-11 text-foreground/40"
                        aria-label="Edit comment"
                        onPress={() => startEditing(comment)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="ghost"
                        className="h-11 w-11 text-foreground/40 hover:text-red-500"
                        aria-label="Delete comment"
                        onPress={() => handleDelete(comment)}
                      >
                        <TrashBin className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <AutoGrowTextarea
                      value={editDraft}
                      onChange={setEditDraft}
                      onSubmit={() => handleSaveEdit(comment)}
                      onCancel={() => setEditingId(null)}
                      placeholder="Edit comment"
                      ariaLabel="Edit comment"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        isIconOnly
                        variant="ghost"
                        className="h-11 w-11"
                        aria-label="Cancel edit"
                        onPress={() => setEditingId(null)}
                      >
                        <Xmark className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        isIconOnly
                        className="h-11 w-11"
                        isDisabled={!editDraft.trim()}
                        aria-label="Save comment"
                        onPress={() => handleSaveEdit(comment)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground/80">
                    {comment.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <AutoGrowTextarea
          value={draft}
          onChange={setDraft}
          onSubmit={handleAdd}
          placeholder="Add a comment…"
          ariaLabel="Add a comment"
        />
        <Button
          isIconOnly
          className="h-11 w-11 shrink-0"
          isDisabled={!draft.trim() || sending}
          aria-label="Send comment"
          onPress={handleAdd}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </Surface>
  );
}
