import type { Project, ProjectInvite, ActivityNotification } from '../models/project';
import type { Unsubscribe } from './types';

export interface ProjectRepository {
  createPersonalProject(userId: string): Promise<string>;
  subscribeUserProjects(userId: string, onProjects: (projects: Project[]) => void): Unsubscribe;
  createProject(userId: string, name: string): Promise<string>;
  deleteProject(projectId: string): Promise<void>;
  renameProject(projectId: string, name: string): Promise<void>;
  inviteMember(
    projectId: string,
    invitedByUserId: string,
    invitedByDisplayName: string,
    inviteeEmail: string,
  ): Promise<void>;
  removeMember(projectId: string, userIdToRemove: string): Promise<void>;
  respondToInvite(
    userId: string,
    userEmail: string,
    displayName: string,
    inviteId: string,
    accept: boolean,
  ): Promise<void>;
  subscribeInvites(
    userEmail: string,
    onInvites: (invites: ProjectInvite[]) => void,
  ): Unsubscribe;
  subscribeProjectActivities(
    projectId: string,
    currentUserId: string,
    onActivities: (activities: ActivityNotification[]) => void,
  ): Unsubscribe;
  logActivity(
    projectId: string,
    activity: Omit<ActivityNotification, 'id' | 'createdAt' | 'projectId'>,
  ): Promise<void>;
}
