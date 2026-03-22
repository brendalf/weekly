export interface Project {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // includes ownerId
  pendingInviteEmails: string[];
  createdAt: string;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByUserId: string;
  invitedByDisplayName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface ActivityNotification {
  id: string;
  projectId: string;
  type: 'habit_completed' | 'task_completed';
  actorUid: string;
  actorDisplayName: string;
  itemId: string;
  itemName: string;
  createdAt: string;
}
