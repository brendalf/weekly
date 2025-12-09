"use client";

import { useState, FormEvent } from "react";
import { Task, createTask } from "@weekly/domain";
import { YStack, H2, Paragraph } from "tamagui";
import { TaskInput } from "./TaskInput";
import { TaskList } from "./TaskList";

export default function Home() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  function handleAddTask(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask: Task = createTask(trimmed);

    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
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

        <TaskList tasks={tasks} />
      </YStack>
    </YStack>
  );
}
