"use client";

import { useCallback } from "react";
import type { ActivityNotification } from "@weekly/domain";
import { useWorkspaceStore } from "../stores/workspace";
import { workspaceRepository } from "../repositories";
import { auth } from "../config/firebase";

/**
 * The payload a caller supplies. Actor, workspace, and timestamp are filled in
 * by the hook, which is the part that was being copy-pasted.
 */
export type ActivityDraft = Omit<
  ActivityNotification,
  "id" | "createdAt" | "workspaceId" | "actorUid" | "actorDisplayName"
>;

/**
 * Announces something to a workspace's activity feed.
 *
 * Extracted per DIRECTION §9.8: the
 * `workspaces.find(...)` → `members.length < 2` → `logActivity(...).catch(() => {})`
 * sequence was copy-pasted in eight places. The three rules it encodes:
 *
 * - a solo workspace has no audience, so nothing is written;
 * - the actor is always the signed-in user;
 * - logging is non-critical — a failure never surfaces to the user or rejects.
 *
 * Returns a stable callback; safe in a dependency array.
 *
 * WS15 migrates the remaining hand-rolled copies (`HabitList`, `TaskList`,
 * `NoteList`, `HabitItem`, `HabitsTasksView`, `CommentSection`) onto this.
 */
export function useActivityLog() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  return useCallback(
    (workspaceId: string | null | undefined, activity: ActivityDraft) => {
      const user = auth.currentUser;
      if (!workspaceId || !user) return;
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace || workspace.members.length < 2) return;

      workspaceRepository
        .logActivity(workspaceId, {
          ...activity,
          actorUid: user.uid,
          actorDisplayName: user.displayName ?? "User",
        })
        .catch(() => {
          /* non-critical */
        });
    },
    [workspaces],
  );
}
