"use client";

import { useState, useEffect, FormEvent } from "react";
import { Task, Habit } from "@weekly/domain";
import { YStack, H2, Paragraph } from "tamagui";
import { TaskInput } from "./components/tasks/TaskInput";
import { TaskList } from "./components/tasks/TaskList";
import { HabitInput } from "./components/habits/HabitInput";
import { HabitList } from "./components/habits/HabitList";
import { WeekPicker } from "./components/calendar/WeekPicker";
import { WeekdaysCarousel } from "./components/calendar/WeekdaysCarousel";
import {
  subscribeToTasks,
  addTaskRemote,
  toggleTaskRemote,
} from "./stores/tasks";
import { addHabbitRemote, subscribeToHabbits } from "./stores/habbits";

export default function Home() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habitName, setHabitName] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);

  const userId = "dev-user";

  useEffect(() => {
    const unsub = subscribeToTasks(userId, (nextTasks) => setTasks(nextTasks));
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    const unsub = subscribeToHabbits(userId, (nextHabits) => setHabits(nextHabits));
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

    addHabbitRemote(userId, trimmed, 1);
    setHabits((prev) => [newHabit, ...prev]);
    setHabitName("");
  }

  return (
    <YStack flex={1} items={"center"} justify="center" p="$4" bg="$background">
      <YStack width="100%" maxW={600} gap="$4">
        <YStack gap="$2">
          <H2>Weekly</H2>
        </YStack>

        <YStack gap="$2">
          <WeekPicker />
          <WeekdaysCarousel />
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

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
