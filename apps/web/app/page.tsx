"use client";

import { useState, useEffect, FormEvent } from "react";
import { Task } from "@weekly/domain";
import { YStack, H2, Paragraph } from "tamagui";
import { TaskInput } from "./TaskInput";
import { TaskList } from "./TaskList";
import {
  subscribeToTasks,
  addTaskRemote,
  toggleTaskRemote,
} from "./lib/tasksStore";

export default function Home() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

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

  return (
    <YStack f={1} ai="center" jc="center" padding="$4" bg="$background">
      <YStack width="100%" maxWidth={600} space="$4">
        <YStack space="$2">
          <H2>Weekly tasks (web)</H2>
          <Paragraph size="$2" color="$color10">
            Add tasks for this week. We will wire sync and mobile later.
          </Paragraph>
        </YStack>

        <TaskInput
          title={title}
          onChangeTitle={setTitle}
          onSubmit={handleAddTask}
        />

        <TaskList tasks={tasks} onToggleCompleted={handleToggleTaskCompleted} />
      </YStack>
    </YStack>
  );
}
