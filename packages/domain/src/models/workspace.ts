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

export interface ActivityNotification {
  id: string;
  workspaceId: string;
  type:
    | 'habit_completed'
    | 'task_completed'
    | 'habit_added'
    | 'task_added'
    | 'note_added'
    | 'note_edited'
    | 'note_deleted'
    | 'comment_added';
  actorUid: string;
  actorDisplayName: string;
  itemId: string;
  itemName: string;
  /**
   * Legacy — the ISO week key (e.g. "2025-W13") carried by note activity docs
   * written before notes were unbound from weeks. No longer written.
   */
  weekKey?: string;
  createdAt: string;
}
