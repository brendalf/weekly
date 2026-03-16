"use client";

import { createContext, useContext } from "react";
import type {
  TaskRepository,
  HabitRepository,
  HabitProgressRepository,
} from "@weekly/domain";

export interface RepoSet {
  task: TaskRepository;
  habit: HabitRepository;
  habitProgress: HabitProgressRepository;
}

interface RepositoryContextValue {
  activeRepos: RepoSet | null;
  getHabitRepos(habitId: string): RepoSet | null;
  getTaskRepos(taskId: string): RepoSet | null;
  getProjectRepos(projectId: string): RepoSet | null;
}

export const RepositoryContext = createContext<RepositoryContextValue>({
  activeRepos: null,
  getHabitRepos: () => null,
  getTaskRepos: () => null,
  getProjectRepos: () => null,
});

export function useRepositoryContext() {
  return useContext(RepositoryContext);
}
