"use client";

import { useState, useEffect, FormEvent } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Task, Habit } from "@weekly/domain";
import { TaskInput } from "../components/tasks/TaskInput";
import { TaskList } from "../components/tasks/TaskList";
import { HabitList } from "../components/habits/HabitList";
import { WeekPicker } from "../components/calendar/WeekPicker";
import { WeekdaysCarousel } from "../components/calendar/WeekdaysCarousel";
import { habitRepository, taskRepository } from "../repositories";
import { auth } from "../config/firebase";

export default function AppPage() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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

  async function handleLogout() {
    await signOut(auth);
    document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.assign("/");
  }

  useEffect(() => {
    if (!userId) return;
    const unsub = taskRepository.subscribeTasks(userId, (nextTasks) =>
      setTasks(nextTasks),
    );
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const unsub = habitRepository.subscribeHabits(userId, (nextHabits) =>
      setHabits(nextHabits),
    );
    return () => unsub();
  }, [userId]);

  function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    taskRepository.addTask(userId, trimmed);
    setTitle("");
  }

  function handleToggleTaskCompleted(taskId: string) {
    if (!userId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    taskRepository.toggleTask(userId, task);
  }

  if (!authReady) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
          <p className="text-sm text-gray-600">Loading…</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
      <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-medium text-purple-700">
              <span className="h-2 w-2 rounded-full bg-purple-600" />
              Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">
              Weekly
              <span className="ml-2 text-purple-700">workspace</span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Plan your week. Execute daily. Track habits automatically.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-medium text-gray-900">
                {user?.displayName ?? "Signed in"}
              </p>
              <p className="text-xs text-gray-500">{user?.email ?? ""}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-900">This week</p>
              <p className="mt-1 text-sm text-gray-600">
                Pick a week and a day — progress updates instantly.
              </p>
            </div>
            <div className="space-y-3">
              <WeekPicker />
              <WeekdaysCarousel />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <HabitList habits={habits} userId={userId} />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <TaskList
              tasks={tasks}
              onToggleCompleted={handleToggleTaskCompleted}
            />
          </section>
        </div>
      </div>
    </main>
  );

