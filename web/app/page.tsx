"use client";

import { useState, useEffect, FormEvent } from "react";
import { Task, Habit, getISOWeek } from "@weekly/domain";
import { YStack, XStack, H2, Paragraph, Button } from "tamagui";
import { TaskInput } from "./components/tasks/TaskInput";
import { TaskList } from "./components/tasks/TaskList";
import { HabitInput } from "./components/habits/HabitInput";
import { HabitList } from "./components/habits/HabitList";
import {
  subscribeToTasks,
  addTaskRemote,
  toggleTaskRemote,
} from "./stores/tasks";

export default function Home() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habitName, setHabitName] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));

  const userId = "dev-user";

  useEffect(() => {
    const unsub = subscribeToTasks(userId, (nextTasks) => setTasks(nextTasks));
    return () => unsub();
  }, [userId]);

  function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addTaskRemote(userId, trimmed);
    setTitle("");
  }

  function handleToggleTaskCompleted(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    toggleTaskRemote(userId, task);
  }

  function handleAddHabit(e: FormEvent) {
    e.preventDefault();
    const trimmed = habitName.trim();
    if (!trimmed) return;

    const newHabit: Habit = {
      id: createLocalId(),
      name: trimmed,
      weeklyTarget: 1,
    };

    setHabits((prev) => [newHabit, ...prev]);
    setHabitName("");
  }

  function handlePrevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function handleNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  const { year, week } = getISOWeek(weekStart);
  const weekDays = getWeekDays(weekStart);

  return (
    <YStack f={1} ai="center" jc="center" padding="$4" bg="$background">
      <YStack width="100%" maxWidth={600} gap="$4">
        <YStack gap="$2">
          <H2>Weekly tasks (web)</H2>
        </YStack>

        <YStack gap="$2">
          <XStack ai="center" jc="space-between">
            <Button size="$2" onPress={handlePrevWeek}>
              ◀
            </Button>
            <Paragraph size="$2">
              Week {week}, {year}
            </Paragraph>
            <Button size="$2" onPress={handleNextWeek}>
              ▶
            </Button>
          </XStack>

          <XStack gap="$2" overflow="auto" pt="$2">
            {weekDays.map((day) => (
              <YStack
                key={day.toISOString()}
                padding="$2"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$borderColor"
                bg="$backgroundStrong"
                minWidth={70}
                ai="center"
                gap="$1"
              >
                <Paragraph size="$1" color="$color10">
                  {day.toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </Paragraph>
                <Paragraph size="$2">
                  {day.toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  })}
                </Paragraph>
              </YStack>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Paragraph size="$2" fontWeight="600">
            Habits
          </Paragraph>
          <HabitInput
            name={habitName}
            onChangeName={setHabitName}
            onSubmit={handleAddHabit}
          />
          <HabitList habits={habits} />
        </YStack>

        <YStack gap="$2">
          <Paragraph size="$2" fontWeight="600">
            Tasks
          </Paragraph>
          <TaskInput
            title={title}
            onChangeTitle={setTitle}
            onSubmit={handleAddTask}
          />
          <TaskList
            tasks={tasks}
            onToggleCompleted={handleToggleTaskCompleted}
          />
        </YStack>
      </YStack>
    </YStack>
  );
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
