"use client";

import { Task } from "@weekly/domain";
import { ListItem, YStack, Paragraph, Checkbox } from "tamagui";

interface TaskListProps {
  tasks: Task[];
  onToggleCompleted: (taskId: string) => void;
}

export function TaskList({ tasks, onToggleCompleted }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Paragraph size="$2" color="$color10">
        No tasks yet. Add your first task above.
      </Paragraph>
    );
  }

  return (
    <YStack gap="$2">
      {tasks.map((task) => (
        <ListItem
          key={task.id}
          title={task.title}
          subTitle={new Date(task.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          size="$3"
          icon={
            <Checkbox
              size="$2"
              checked={task.completed}
              onCheckedChange={() => onToggleCompleted(task.id)}
            >
              <Checkbox.Indicator>
                <span style={{ fontSize: 10 }}>✓</span>
              </Checkbox.Indicator>
            </Checkbox>
          }
        />
      ))}
    </YStack>
  );
}
