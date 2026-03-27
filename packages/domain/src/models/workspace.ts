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
  type: 'habit_completed' | 'task_completed';
  actorUid: string;
  actorDisplayName: string;
  itemId: string;
  itemName: string;
  createdAt: string;
}
