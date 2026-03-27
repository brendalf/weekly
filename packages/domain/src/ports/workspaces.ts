import type { Workspace, WorkspaceInvite, ActivityNotification } from '../models/workspace';
import type { Unsubscribe } from './types';

export interface WorkspaceRepository {
  createPersonalWorkspace(userId: string): Promise<string>;
  subscribeUserWorkspaces(userId: string, onWorkspaces: (workspaces: Workspace[]) => void): Unsubscribe;
  createWorkspace(userId: string, name: string): Promise<string>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  renameWorkspace(workspaceId: string, name: string): Promise<void>;
  inviteMember(
    workspaceId: string,
    invitedByUserId: string,
    invitedByDisplayName: string,
    inviteeEmail: string,
  ): Promise<void>;
  removeMember(workspaceId: string, userIdToRemove: string): Promise<void>;
  respondToInvite(
    userId: string,
    userEmail: string,
    displayName: string,
    inviteId: string,
    accept: boolean,
  ): Promise<void>;
  subscribeInvites(
    userEmail: string,
    onInvites: (invites: WorkspaceInvite[]) => void,
  ): Unsubscribe;
  subscribeWorkspaceActivities(
    workspaceId: string,
    currentUserId: string,
    onActivities: (activities: ActivityNotification[]) => void,
  ): Unsubscribe;
  logActivity(
    workspaceId: string,
    activity: Omit<ActivityNotification, 'id' | 'createdAt' | 'workspaceId'>,
  ): Promise<void>;
}
