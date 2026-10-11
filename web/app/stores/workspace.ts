"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Workspace, WorkspaceInvite, ActivityNotification } from "@weekly/domain";

interface WorkspaceState {
  workspaces: Workspace[];
  /** Workspaces the user picked. Empty array = all workspaces. */
  selectedWorkspaceIds: string[];
  pendingInvites: WorkspaceInvite[];
  activityNotifications: ActivityNotification[];
  lastNotificationReadAt: string | null;
}

type Listener = () => void;

let state: WorkspaceState = {
  workspaces: [],
  selectedWorkspaceIds: [],
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

/**
 * Collapses to `[]` ("all") when the ids cover every known workspace or none at
 * all. Ids of workspaces that are not loaded yet are kept as-is so a selection
 * hydrated from preferences before the workspaces snapshot survives;
 * `useWorkspaceSelection` filters them against membership at read time.
 */
function normalizeSelection(ids: string[]): string[] {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const known = state.workspaces.map((w) => w.id);
  if (known.length > 0 && known.every((id) => unique.includes(id))) return [];
  return unique;
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
  setSelectedWorkspaceIds(ids: string[]) {
    setState({ selectedWorkspaceIds: normalizeSelection(ids) });
  },
  /** Remove the id if selected, otherwise add it. Never ends up empty. */
  toggleWorkspaceSelection(id: string) {
    const known = state.workspaces.map((w) => w.id);
    const current = state.selectedWorkspaceIds.length
      ? state.selectedWorkspaceIds.filter((wid) => known.includes(wid))
      : known;
    const next = current.includes(id)
      ? current.filter((wid) => wid !== id)
      : [...current, id];
    setState({ selectedWorkspaceIds: normalizeSelection(next) });
  },
  selectAllWorkspaces() {
    setState({ selectedWorkspaceIds: [] });
  },
  selectOnlyWorkspace(id: string) {
    setState({ selectedWorkspaceIds: normalizeSelection([id]) });
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

export interface SelectionInfo {
  /** Concrete, membership-filtered ids currently in view. Never empty once workspaces load. */
  workspaceIds: string[];
  isAll: boolean;
  isSingle: boolean;
  /** The id when exactly one workspace is in view, else null. */
  singleId: string | null;
}

/**
 * Resolves the stored selection against the workspaces the user is a member of.
 * An empty stored selection — or one whose ids are all stale — means "all".
 */
export function useWorkspaceSelection(): SelectionInfo {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selectedWorkspaceIds = useWorkspaceStore((s) => s.selectedWorkspaceIds);

  return useMemo(() => {
    const allIds = workspaces.map((w) => w.id);
    const filtered = selectedWorkspaceIds.length
      ? allIds.filter((id) => selectedWorkspaceIds.includes(id))
      : allIds;
    const workspaceIds = filtered.length > 0 ? filtered : allIds;
    const isSingle = workspaceIds.length === 1;
    return {
      workspaceIds,
      isAll: workspaceIds.length === allIds.length,
      isSingle,
      singleId: isSingle ? workspaceIds[0] : null,
    };
  }, [workspaces, selectedWorkspaceIds]);
}
