"use client";

import {
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type { LayoutPreference, ActivityNotification } from "@weekly/domain";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { formatDayLabel } from "@weekly/domain";
import { ArrowRightFromSquare } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { HabitsTasksView } from "../components/HabitsTasksView";
import { WeekPicker } from "../components/calendar/WeekPicker";
import { WeekdaysCarousel } from "../components/calendar/WeekdaysCarousel";
import { useCalendarStore } from "../stores/calendar";
import { useProjectStore, projectStore } from "../stores/project";
import { RepositoryContext } from "../contexts/RepositoryContext";
import { projectRepository, userPreferencesRepository, db } from "../repositories";
import { auth } from "../config/firebase";
import { ThemeContext } from "../providers";
import { ThemeToggleButton } from "../components/general/ThemeToggleButton";
import { ProjectSwitcher } from "../components/projects/ProjectSwitcher";
import { NotificationBell } from "../components/projects/NotificationBell";
import { useProjectData } from "../hooks/useProjectData";

export default function AppPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);


  const personalProjectCreatedRef = useRef(false);
  const { setTheme } = useContext(ThemeContext);
  const [layout, setLayout] = useState<LayoutPreference>("period-tabs");

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDayLabel = formatDayLabel(
    selectedDayISO ? new Date(selectedDayISO) : new Date(),
  );

  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const { tasks, habits, activeRepos, getHabitRepos, getTaskRepos, getProjectRepos, getHabitProjectId, getTaskProjectId } =
    useProjectData(db);

  const contextValue = useMemo(
    () => ({ activeRepos, getHabitRepos, getTaskRepos, getProjectRepos, getHabitProjectId, getTaskProjectId }),
    [activeRepos, getHabitRepos, getTaskRepos, getProjectRepos, getHabitProjectId, getTaskProjectId],
  );

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setUserId(firebaseUser?.uid ?? null);
      setAuthReady(true);
      if (!firebaseUser) {
        document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
        window.location.assign("/");
      }
    });
    return () => unsub();
  }, []);

  // User preferences
  useEffect(() => {
    if (!userId) return;
    return userPreferencesRepository.subscribeUserPreferences(
      userId,
      ({ theme, layout }) => { setTheme(theme); setLayout(layout); },
    );
  }, [userId, setTheme]);

  // Subscribe to projects; create Personal project on first login
  useEffect(() => {
    if (!userId || !user) return;
    return projectRepository.subscribeUserProjects(userId, (userProjects) => {
      projectStore.setProjects(userProjects);
      if (userProjects.length === 0 && !personalProjectCreatedRef.current) {
        personalProjectCreatedRef.current = true;
        projectRepository.createPersonalProject(userId);
      } else if (userProjects.length === 1) {
        projectStore.setActiveProject(userProjects[0].id);
      }
    });
  }, [userId, user]);

  // Subscribe to pending invites
  useEffect(() => {
    if (!user?.email) return;
    return projectRepository.subscribeInvites(user.email, (invites) => {
      projectStore.setPendingInvites(invites);
    });
  }, [user?.email]);

  // Subscribe to activity notifications across all projects
  useEffect(() => {
    if (!userId || projects.length === 0) return;

    const activitiesPerProject = new Map<string, ActivityNotification[]>();
    const unsubs: (() => void)[] = [];

    for (const project of projects) {
      unsubs.push(
        projectRepository.subscribeProjectActivities(
          project.id,
          userId,
          (acts) => {
            activitiesPerProject.set(project.id, acts);
            const all = [...activitiesPerProject.values()].flat();
            all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            projectStore.setActivityNotifications(all);
          },
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [userId, projects]);

  const handleLayoutChange = useCallback(async (newLayout: LayoutPreference) => {
    if (!userId) return;
    setLayout(newLayout);
    await userPreferencesRepository.updateLayout(userId, newLayout);
  }, [userId]);

  async function handleToggleTaskCompleted(taskId: string) {
    const repos = getTaskRepos(taskId);
    if (!repos) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const wasCompleted = task.completed;
    await repos.task.toggleTask(task);
    if (!wasCompleted && user) {
      const projectId = getTaskProjectId(taskId);
      const project = projects.find((p) => p.id === projectId);
      if (projectId && project && project.members.length > 1) {
        try {
          await projectRepository.logActivity(projectId, {
            type: "task_completed",
            actorUid: user.uid,
            actorDisplayName: user.displayName ?? "User",
            itemId: taskId,
            itemName: task.title,
          });
        } catch {
          // non-critical
        }
      }
    }
  }

  async function handleLogout() {
    await signOut(auth);
    document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.assign("/");
  }

  if (!authReady) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-foreground/60">Loading…</p>
      </main>
    );
  }
  if (!userId) return null;

  return (
    <RepositoryContext.Provider value={contextValue}>
      <main className="min-h-screen bg-background">
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center justify-between">
                <ProjectSwitcher />
                <div className="flex items-center gap-3 sm:hidden">
                  <NotificationBell />
                  <ThemeToggleButton userId={userId} />
                  <Button variant="danger" size="sm" isIconOnly aria-label="Log out" onPress={handleLogout}>
                    <ArrowRightFromSquare />
                  </Button>
                </div>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {selectedDayLabel}
              </h1>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <p className="text-sm font-medium text-foreground">
                  {user?.displayName ?? "Signed in"}
                </p>
                <p className="text-xs text-foreground/60">
                  {user?.email ?? ""}
                </p>
              </div>
              <NotificationBell />
              <ThemeToggleButton userId={userId} />
              <Button variant="danger" size="sm" isIconOnly aria-label="Log out" onPress={handleLogout}>
                <ArrowRightFromSquare />
              </Button>
            </div>
          </header>

          <div className="py-5 flex flex-col gap-2">
            <WeekPicker />
            <WeekdaysCarousel />
          </div>

          <HabitsTasksView
            habits={habits}
            tasks={tasks}
            projects={activeProjectId === null ? projects : undefined}
            layout={layout}
            onToggleTaskCompleted={handleToggleTaskCompleted}
            onLayoutChange={handleLayoutChange}
          />
        </div>
      </main>
    </RepositoryContext.Provider>
  );
}
