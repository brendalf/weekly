"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Firestore } from "firebase/firestore";
import type { Task, Habit } from "@weekly/domain";
import {
  createTaskRepository,
  createHabitRepository,
  createHabitProgressRepository,
  createNoteRepository,
} from "@weekly/firebase";
import { useWorkspaceStore } from "../stores/workspace";
import type { RepoSet } from "../contexts/RepositoryContext";

export function useWorkspaceData(db: Firestore) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const workspaceReposRef = useRef<Map<string, RepoSet>>(new Map());
  const habitWorkspaceMapRef = useRef<Map<string, string>>(new Map());
  const taskWorkspaceMapRef = useRef<Map<string, string>>(new Map());

  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  const getOrCreateRepos = useCallback(
    (workspaceId: string): RepoSet => {
      if (!workspaceReposRef.current.has(workspaceId)) {
        workspaceReposRef.current.set(workspaceId, {
          task: createTaskRepository(db, workspaceId),
          habit: createHabitRepository(db, workspaceId),
          habitProgress: createHabitProgressRepository(db, workspaceId),
          note: createNoteRepository(db, workspaceId),
        });
      }
      return workspaceReposRef.current.get(workspaceId)!;
    },
    [db],
  );

  // Ensure repos exist for all known workspaces
  useEffect(() => {
    for (const workspace of workspaces) {
      getOrCreateRepos(workspace.id);
    }
  }, [workspaces, getOrCreateRepos]);

  // workspaceReposRef is a mutable cache (not render state) — ref access here is intentional
  const activeRepos = useMemo(() => {
    if (!activeWorkspaceId) return null;
    // eslint-disable-next-line react-hooks/refs
    return getOrCreateRepos(activeWorkspaceId);
  }, [activeWorkspaceId, getOrCreateRepos]);

  // Subscribe to tasks/habits for single workspace view
  useEffect(() => {
    if (activeWorkspaceId === null || !activeRepos) return;
    return activeRepos.habit.subscribeHabits(setHabits);
  }, [activeWorkspaceId, activeRepos]);

  useEffect(() => {
    if (activeWorkspaceId === null || !activeRepos) return;
    return activeRepos.task.subscribeTasks(setTasks);
  }, [activeWorkspaceId, activeRepos]);

  // Subscribe to all workspaces in base view
  useEffect(() => {
    if (activeWorkspaceId !== null || workspaces.length === 0) return;

    const allHabitsPerWorkspace = new Map<string, Habit[]>();
    const allTasksPerWorkspace = new Map<string, Task[]>();
    const unsubs: (() => void)[] = [];

    for (const workspace of workspaces) {
      const repos = getOrCreateRepos(workspace.id);

      unsubs.push(
        repos.habit.subscribeHabits((workspaceHabits) => {
          allHabitsPerWorkspace.set(workspace.id, workspaceHabits);
          for (const h of workspaceHabits) {
            habitWorkspaceMapRef.current.set(h.id, workspace.id);
          }
          setHabits([...allHabitsPerWorkspace.values()].flat());
        }),
      );

      unsubs.push(
        repos.task.subscribeTasks((workspaceTasks) => {
          allTasksPerWorkspace.set(workspace.id, workspaceTasks);
          for (const t of workspaceTasks) {
            taskWorkspaceMapRef.current.set(t.id, workspace.id);
          }
          setTasks([...allTasksPerWorkspace.values()].flat());
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [activeWorkspaceId, workspaces, getOrCreateRepos]);

  const getHabitRepos = useCallback(
    (habitId: string): RepoSet | null => {
      if (activeWorkspaceId && activeRepos) return activeRepos;
      const workspaceId = habitWorkspaceMapRef.current.get(habitId);
      if (!workspaceId) return null;
      return workspaceReposRef.current.get(workspaceId) ?? null;
    },
    [activeWorkspaceId, activeRepos],
  );

  const getTaskRepos = useCallback(
    (taskId: string): RepoSet | null => {
      if (activeWorkspaceId && activeRepos) return activeRepos;
      const workspaceId = taskWorkspaceMapRef.current.get(taskId);
      if (!workspaceId) return null;
      return workspaceReposRef.current.get(workspaceId) ?? null;
    },
    [activeWorkspaceId, activeRepos],
  );

  const getWorkspaceRepos = useCallback(
    (workspaceId: string): RepoSet | null => {
      return getOrCreateRepos(workspaceId);
    },
    [getOrCreateRepos],
  );

  const getHabitProjectId = useCallback(
    (habitId: string): string | null =>
      habitWorkspaceMapRef.current.get(habitId) ?? null,
    [],
  );

  const getTaskProjectId = useCallback(
    (taskId: string): string | null =>
      taskWorkspaceMapRef.current.get(taskId) ?? null,
    [],
  );

  return {
    tasks,
    habits,
    activeRepos,
    getHabitRepos,
    getTaskRepos,
    getWorkspaceRepos,
    getHabitProjectId,
    getTaskProjectId,
  };
}
