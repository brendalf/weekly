"use client";

import { Task } from "@weekly/domain";
import { ListItem, YStack, Paragraph } from "tamagui";

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Paragraph size="$2" color="$color10">
        No tasks yet. Add your first task above.
      </Paragraph>
    );
  }

  return (
    <YStack space="$2">
      {tasks.map((task) => (
        <ListItem
          key={task.id}
          title={task.title}
          subTitle={new Date(task.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          size="$3"
        />
      ))}
    </YStack>
  );
}
