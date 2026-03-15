"use client";

import { useState, useEffect, useContext } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Task, Habit, formatDayLabel } from "@weekly/domain";
import { ArrowRightFromSquare, House } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { TaskList } from "../components/tasks/TaskList";
import { HabitList } from "../components/habits/HabitList";
import { WeekPicker } from "../components/calendar/WeekPicker";
import { WeekdaysCarousel } from "../components/calendar/WeekdaysCarousel";
import { useCalendarStore } from "../stores/calendar";
import {
  habitRepository,
  taskRepository,
  userPreferencesRepository,
} from "../repositories";
import { auth } from "../config/firebase";
import { ThemeContext } from "../providers";
import { ThemeToggleButton } from "../components/general/ThemeToggleButton";

export default function AppPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { setTheme } = useContext(ThemeContext);

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDayLabel = formatDayLabel(
    selectedDayISO ? new Date(selectedDayISO) : new Date(),
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setUserId(user?.uid ?? null);
      setAuthReady(true);
      if (!user) {
        document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
        window.location.assign("/");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    return userPreferencesRepository.subscribeUserPreferences(
      userId,
      ({ theme }) => {
        setTheme(theme);
      },
    );
  }, [userId, setTheme]);

  useEffect(() => {
    if (!userId) return;
    return taskRepository.subscribeTasks(userId, setTasks);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return habitRepository.subscribeHabits(userId, setHabits);
  }, [userId]);

  async function handleLogout() {
    await signOut(auth);
    document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.assign("/");
  }

  function handleToggleTaskCompleted(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    taskRepository.toggleTask(userId, task);
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500  bg-surface px-3 py-1 text-xs font-medium text-primary">
              <House width={12} height={12} />
              Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              {selectedDayLabel}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <p className="text-sm font-medium text-foreground">
                {user?.displayName ?? "Signed in"}
              </p>
              <p className="text-xs text-foreground/60">{user?.email ?? ""}</p>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-surface p-4">
            <HabitList habits={habits} userId={userId} />
          </section>

          <section className="rounded-2xl border bg-surface p-4">
            <TaskList
              tasks={tasks}
              userId={userId}
              onToggleCompleted={handleToggleTaskCompleted}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
