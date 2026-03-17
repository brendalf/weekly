"use client";

import {
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type { LayoutPreference } from "@weekly/domain";
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
import { InviteNotification } from "../components/projects/InviteNotification";
import { useProjectData } from "../hooks/useProjectData";

export default function AppPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const personalProjectCreatedRef = useRef(false);
  const { setTheme } = useContext(ThemeContext);
  const [layout, setLayout] = useState<LayoutPreference>("tabs");

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

  const handleLayoutChange = useCallback(async (newLayout: LayoutPreference) => {
    if (!userId) return;
    setLayout(newLayout);
    await userPreferencesRepository.updateLayout(userId, newLayout);
  }, [userId]);

  function handleToggleTaskCompleted(taskId: string) {
    const repos = getTaskRepos(taskId);
    if (!repos) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    repos.task.toggleTask(task);
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
              <ProjectSwitcher />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {selectedDayLabel}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {user?.email && (
                <InviteNotification userEmail={user.email} />
              )}
              <div className="hidden flex-col items-end sm:flex">
                <p className="text-sm font-medium text-foreground">
                  {user?.displayName ?? "Signed in"}
                </p>
                <p className="text-xs text-foreground/60">
                  {user?.email ?? ""}
                </p>
              </div>
              <ThemeToggleButton userId={userId} />
              <Button
                variant="danger"
                size="sm"
                isIconOnly
                aria-label="Log out"
                onPress={handleLogout}
              >
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
            userId={userId}
            onToggleTaskCompleted={handleToggleTaskCompleted}
            onLayoutChange={handleLayoutChange}
          />
        </div>
      </main>
    </RepositoryContext.Provider>
  );
}
