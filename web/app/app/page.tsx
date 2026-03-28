"use client";

import {
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type { LayoutPreference, InnerLayoutPreference, ActivityNotification } from "@weekly/domain";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { formatDayLabel } from "@weekly/domain";
import { ArrowRightFromSquare } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { HabitsTasksView } from "../components/HabitsTasksView";
import { WeekPicker } from "../components/calendar/WeekPicker";
import { WeekdaysCarousel } from "../components/calendar/WeekdaysCarousel";
import { useCalendarStore } from "../stores/calendar";
import { useWorkspaceStore, workspaceStore } from "../stores/workspace";
import { RepositoryContext } from "../contexts/RepositoryContext";
import { workspaceRepository, userPreferencesRepository, db } from "../repositories";
import { auth } from "../config/firebase";
import { ThemeContext } from "../providers";
import { ThemeToggleButton } from "../components/general/ThemeToggleButton";
import { WorkspaceSwitcher } from "../components/workspaces/WorkspaceSwitcher";
import { NotificationBell } from "../components/workspaces/NotificationBell";
import { useWorkspaceData } from "../hooks/useWorkspaceData";

export default function AppPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);


  const personalWorkspaceCreatedRef = useRef(false);
  const { setTheme } = useContext(ThemeContext);
  const [layout, setLayout] = useState<LayoutPreference>("period-tabs");
  const [innerLayout, setInnerLayout] = useState<InnerLayoutPreference>("sequential");
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [showSkippedHabits, setShowSkippedHabits] = useState(true);

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDayLabel = formatDayLabel(
    selectedDayISO ? new Date(selectedDayISO) : new Date(),
  );

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const { tasks, habits, activeRepos, getHabitRepos, getTaskRepos, getWorkspaceRepos, getHabitProjectId, getTaskProjectId } =
    useWorkspaceData(db);

  const contextValue = useMemo(
    () => ({ activeRepos, getHabitRepos, getTaskRepos, getWorkspaceRepos, getHabitProjectId, getTaskProjectId }),
    [activeRepos, getHabitRepos, getTaskRepos, getWorkspaceRepos, getHabitProjectId, getTaskProjectId],
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
      ({ theme, layout, innerLayout, showCompletedTasks, showSkippedHabits, lastNotificationReadAt }) => {
        setTheme(theme);
        setLayout(layout);
        setInnerLayout(innerLayout);
        setShowCompletedTasks(showCompletedTasks);
        setShowSkippedHabits(showSkippedHabits);
        if (lastNotificationReadAt) {
          workspaceStore.setLastNotificationReadAt(lastNotificationReadAt);
        }
      },
    );
  }, [userId, setTheme]);

  // Subscribe to workspaces; create Personal workspace on first login
  useEffect(() => {
    if (!userId || !user) return;
    return workspaceRepository.subscribeUserWorkspaces(userId, (userWorkspaces) => {
      workspaceStore.setWorkspaces(userWorkspaces);
      if (userWorkspaces.length === 0 && !personalWorkspaceCreatedRef.current) {
        personalWorkspaceCreatedRef.current = true;
        workspaceRepository.createPersonalWorkspace(userId);
      } else if (userWorkspaces.length === 1) {
        workspaceStore.setActiveWorkspace(userWorkspaces[0].id);
      }
    });
  }, [userId, user]);

  // Subscribe to pending invites
  useEffect(() => {
    if (!user?.email) return;
    return workspaceRepository.subscribeInvites(user.email, (invites) => {
      workspaceStore.setPendingInvites(invites);
    });
  }, [user?.email]);

  // Subscribe to activity notifications across all workspaces
  useEffect(() => {
    if (!userId || workspaces.length === 0) return;

    const activitiesPerWorkspace = new Map<string, ActivityNotification[]>();
    const unsubs: (() => void)[] = [];

    for (const workspace of workspaces) {
      unsubs.push(
        workspaceRepository.subscribeWorkspaceActivities(
          workspace.id,
          userId,
          (acts) => {
            activitiesPerWorkspace.set(workspace.id, acts);
            const all = [...activitiesPerWorkspace.values()].flat();
            all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            workspaceStore.setActivityNotifications(all);
          },
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [userId, workspaces]);

  const handleLayoutChange = useCallback(async (newLayout: LayoutPreference) => {
    if (!userId) return;
    setLayout(newLayout);
    await userPreferencesRepository.updateLayout(userId, newLayout);
  }, [userId]);

  const handleInnerLayoutChange = useCallback(async (newInnerLayout: InnerLayoutPreference) => {
    if (!userId) return;
    setInnerLayout(newInnerLayout);
    await userPreferencesRepository.updateInnerLayout(userId, newInnerLayout);
  }, [userId]);

  const handleShowCompletedTasksChange = useCallback(async (show: boolean) => {
    if (!userId) return;
    setShowCompletedTasks(show);
    await userPreferencesRepository.updateShowCompletedTasks(userId, show);
  }, [userId]);

  const handleShowSkippedHabitsChange = useCallback(async (show: boolean) => {
    if (!userId) return;
    setShowSkippedHabits(show);
    await userPreferencesRepository.updateShowSkippedHabits(userId, show);
  }, [userId]);

  async function handleToggleTaskCompleted(taskId: string) {
    const repos = getTaskRepos(taskId);
    if (!repos) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const wasCompleted = task.completed;
    await repos.task.toggleTask(task);
    if (!wasCompleted && user) {
      const workspaceId = getTaskProjectId(taskId);
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (workspaceId && workspace && workspace.members.length > 1) {
        try {
          await workspaceRepository.logActivity(workspaceId, {
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
                <WorkspaceSwitcher />
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
            workspaces={activeWorkspaceId === null ? workspaces : undefined}
            layout={layout}
            innerLayout={innerLayout}
            showCompletedTasks={showCompletedTasks}
            showSkippedHabits={showSkippedHabits}
            onToggleTaskCompleted={handleToggleTaskCompleted}
            onLayoutChange={handleLayoutChange}
            onInnerLayoutChange={handleInnerLayoutChange}
            onShowCompletedTasksChange={handleShowCompletedTasksChange}
            onShowSkippedHabitsChange={handleShowSkippedHabitsChange}
          />
        </div>
      </main>
    </RepositoryContext.Provider>
  );
}
