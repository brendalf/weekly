"use client";

import { useSyncExternalStore } from "react";
import type { Project, ProjectInvite } from "@weekly/domain";

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  pendingInvites: ProjectInvite[];
}

type Listener = () => void;

let state: ProjectState = {
  projects: [],
  activeProjectId: null,
  pendingInvites: [],
};

const listeners = new Set<Listener>();

function emitChange() {
  for (const l of listeners) l();
}

function setState(partial: Partial<ProjectState>) {
  state = { ...state, ...partial };
  emitChange();
}

export const projectStore = {
  getState() {
    return state;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setProjects(projects: Project[]) {
    setState({ projects });
  },
  setActiveProject(id: string | null) {
    setState({ activeProjectId: id });
  },
  setPendingInvites(invites: ProjectInvite[]) {
    setState({ pendingInvites: invites });
  },
};

export function useProjectStore<T>(selector: (s: ProjectState) => T): T {
  return useSyncExternalStore(
    projectStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
