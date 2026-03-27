"use client";

import { useSyncExternalStore } from "react";
import type { Workspace, WorkspaceInvite, ActivityNotification } from "@weekly/domain";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  pendingInvites: WorkspaceInvite[];
  activityNotifications: ActivityNotification[];
  lastNotificationReadAt: string | null;
}

type Listener = () => void;

let state: WorkspaceState = {
  workspaces: [],
  activeWorkspaceId: null,
  pendingInvites: [],
  activityNotifications: [],
  lastNotificationReadAt: null,
};

const listeners = new Set<Listener>();

function emitChange() {
  for (const l of listeners) l();
}

function setState(partial: Partial<WorkspaceState>) {
  state = { ...state, ...partial };
  emitChange();
}

export const workspaceStore = {
  getState() {
    return state;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setWorkspaces(workspaces: Workspace[]) {
    setState({ workspaces });
  },
  setActiveWorkspace(id: string | null) {
    setState({ activeWorkspaceId: id });
  },
  setPendingInvites(invites: WorkspaceInvite[]) {
    setState({ pendingInvites: invites });
  },
  setActivityNotifications(activities: ActivityNotification[]) {
    setState({ activityNotifications: activities });
  },
  setLastNotificationReadAt(ts: string) {
    setState({ lastNotificationReadAt: ts });
  },
};

export function useWorkspaceStore<T>(selector: (s: WorkspaceState) => T): T {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
