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
