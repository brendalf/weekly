"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Firestore } from "firebase/firestore";
import type { Task, Habit } from "@weekly/domain";
import {
  createTaskRepository,
  createHabitRepository,
  createHabitProgressRepository,
  createNoteRepository,
  createCommentRepository,
} from "@weekly/firebase";
import { useWorkspaceStore, useWorkspaceSelection } from "../stores/workspace";
import type { RepoSet } from "../contexts/RepositoryContext";

export function useWorkspaceData(db: Firestore) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selection = useWorkspaceSelection();

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
          comment: createCommentRepository(db, workspaceId),
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

  // Stable key: Firestore snapshots hand us a fresh `workspaces` array on every
  // update, and depending on the array identity would tear down and rebuild
  // every subscription each time (see commit d4f24b1).
  const workspaceIdsKey = selection.workspaceIds.join(",");
  const singleId = selection.singleId;

  // workspaceReposRef is a mutable cache (not render state) — ref access here is intentional
  const activeRepos = useMemo(() => {
    if (!singleId) return null;
    // eslint-disable-next-line react-hooks/refs
    return getOrCreateRepos(singleId);
  }, [singleId, getOrCreateRepos]);

  // Subscribe to habits/tasks for every workspace in view and merge the results.
  // Single-workspace mode is just the one-id case of this path, so the
  // habit/task -> workspace maps are always populated.
  useEffect(() => {
    const workspaceIds = workspaceIdsKey ? workspaceIdsKey.split(",") : [];
    if (workspaceIds.length === 0) {
      setHabits([]);
      setTasks([]);
      return;
    }

    const habitsPerWorkspace = new Map<string, Habit[]>();
    const tasksPerWorkspace = new Map<string, Task[]>();
    const unsubs: (() => void)[] = [];

    for (const workspaceId of workspaceIds) {
      const repos = getOrCreateRepos(workspaceId);

      unsubs.push(
        repos.habit.subscribeHabits((workspaceHabits) => {
          habitsPerWorkspace.set(workspaceId, workspaceHabits);
          for (const h of workspaceHabits) {
            habitWorkspaceMapRef.current.set(h.id, workspaceId);
          }
          setHabits([...habitsPerWorkspace.values()].flat());
        }),
      );

      unsubs.push(
        repos.task.subscribeTasks((workspaceTasks) => {
          tasksPerWorkspace.set(workspaceId, workspaceTasks);
          for (const t of workspaceTasks) {
            taskWorkspaceMapRef.current.set(t.id, workspaceId);
          }
          setTasks([...tasksPerWorkspace.values()].flat());
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [workspaceIdsKey, getOrCreateRepos]);

  const getHabitRepos = useCallback(
    (habitId: string): RepoSet | null => {
      const workspaceId = habitWorkspaceMapRef.current.get(habitId);
      if (workspaceId) {
        return workspaceReposRef.current.get(workspaceId) ?? activeRepos;
      }
      return activeRepos;
    },
    [activeRepos],
  );

  const getTaskRepos = useCallback(
    (taskId: string): RepoSet | null => {
      const workspaceId = taskWorkspaceMapRef.current.get(taskId);
      if (workspaceId) {
        return workspaceReposRef.current.get(workspaceId) ?? activeRepos;
      }
      return activeRepos;
    },
    [activeRepos],
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
