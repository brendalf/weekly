"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Firestore } from "firebase/firestore";
import type { Task, Habit } from "@weekly/domain";
import {
  createTaskRepository,
  createHabitRepository,
  createHabitProgressRepository,
} from "@weekly/firebase";
import { useProjectStore } from "../stores/project";
import type { RepoSet } from "../contexts/RepositoryContext";

export function useProjectData(db: Firestore) {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const projectReposRef = useRef<Map<string, RepoSet>>(new Map());
  const habitProjectMapRef = useRef<Map<string, string>>(new Map());
  const taskProjectMapRef = useRef<Map<string, string>>(new Map());

  const [activeRepos, setActiveRepos] = useState<RepoSet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  function getOrCreateRepos(projectId: string): RepoSet {
    if (!projectReposRef.current.has(projectId)) {
      projectReposRef.current.set(projectId, {
        task: createTaskRepository(db, projectId),
        habit: createHabitRepository(db, projectId),
        habitProgress: createHabitProgressRepository(db, projectId),
      });
    }
    return projectReposRef.current.get(projectId)!;
  }

  // Ensure repos exist for all known projects
  useEffect(() => {
    for (const project of projects) {
      getOrCreateRepos(project.id);
    }
  }, [projects]);

  // Sync activeRepos when active project changes
  useEffect(() => {
    if (activeProjectId) {
      setActiveRepos(getOrCreateRepos(activeProjectId));
    } else {
      setActiveRepos(null);
    }
  }, [activeProjectId]);

  // Subscribe to tasks/habits for single project view
  useEffect(() => {
    if (activeProjectId === null || !activeRepos) return;
    return activeRepos.habit.subscribeHabits(setHabits);
  }, [activeProjectId, activeRepos]);

  useEffect(() => {
    if (activeProjectId === null || !activeRepos) return;
    return activeRepos.task.subscribeTasks(setTasks);
  }, [activeProjectId, activeRepos]);

  // Subscribe to all projects in base view
  useEffect(() => {
    if (activeProjectId !== null || projects.length === 0) return;

    const allHabitsPerProject = new Map<string, Habit[]>();
    const allTasksPerProject = new Map<string, Task[]>();
    const unsubs: (() => void)[] = [];

    for (const project of projects) {
      const repos = getOrCreateRepos(project.id);

      unsubs.push(
        repos.habit.subscribeHabits((projectHabits) => {
          allHabitsPerProject.set(project.id, projectHabits);
          for (const h of projectHabits) {
            habitProjectMapRef.current.set(h.id, project.id);
          }
          setHabits([...allHabitsPerProject.values()].flat());
        }),
      );

      unsubs.push(
        repos.task.subscribeTasks((projectTasks) => {
          allTasksPerProject.set(project.id, projectTasks);
          for (const t of projectTasks) {
            taskProjectMapRef.current.set(t.id, project.id);
          }
          setTasks([...allTasksPerProject.values()].flat());
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [activeProjectId, projects]);

  const getHabitRepos = useCallback(
    (habitId: string): RepoSet | null => {
      if (activeProjectId && activeRepos) return activeRepos;
      const projectId = habitProjectMapRef.current.get(habitId);
      if (!projectId) return null;
      return projectReposRef.current.get(projectId) ?? null;
    },
    [activeProjectId, activeRepos],
  );

  const getTaskRepos = useCallback(
    (taskId: string): RepoSet | null => {
      if (activeProjectId && activeRepos) return activeRepos;
      const projectId = taskProjectMapRef.current.get(taskId);
      if (!projectId) return null;
      return projectReposRef.current.get(projectId) ?? null;
    },
    [activeProjectId, activeRepos],
  );

  const getProjectRepos = useCallback(
    (projectId: string): RepoSet | null => {
      return projectReposRef.current.get(projectId) ?? null;
    },
    [],
  );

  return {
    tasks,
    habits,
    activeRepos,
    getHabitRepos,
    getTaskRepos,
    getProjectRepos,
  };
}
