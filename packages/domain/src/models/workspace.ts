import type { Period } from './habit';
import type { CommentTarget } from './comment';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // includes ownerId
  pendingInviteEmails: string[];
  createdAt: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedByUserId: string;
  invitedByDisplayName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export type ActivityType =
  | 'habit_completed'
  /** A mark on a multi-target habit that did not finish its period yet. */
  | 'habit_progress'
  | 'task_completed'
  | 'habit_added'
  | 'task_added'
  | 'note_added'
  | 'note_edited'
  | 'note_deleted'
  | 'comment_added';

export interface ActivityNotification {
  id: string;
  workspaceId: string;
  type: ActivityType;
  actorUid: string;
  actorDisplayName: string;
  itemId: string;
  itemName: string;
  /**
   * Habit activity only — how the habit recurs, so the feed can tell a daily
   * mark from one counting toward a week or a month.
   */
  habitPeriod?: Period;
  /**
   * Habit activity only — the period key the mark counted toward
   * (`periodKeyOf`): "2026-03-15", "2026-W11" or "2026-03".
   */
  periodKey?: string;
  /** Habit activity only — the day that was marked (YYYY-MM-DD). */
  dayKey?: string;
  /** Habit activity only — count after the mark, and the period target. */
  progressCount?: number;
  progressTarget?: number;
  /** Comment activity only — whether the commented item is a habit or a task. */
  commentTarget?: CommentTarget;
  /** Comment activity only — truncated comment body for the feed preview. */
  commentBody?: string;
  /**
   * Legacy — the ISO week key (e.g. "2025-W13") carried by note activity docs
   * written before notes were unbound from weeks. No longer written.
   */
  weekKey?: string;
  createdAt: string;
}
