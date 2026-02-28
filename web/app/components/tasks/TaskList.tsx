"use client";

import { Task } from "@weekly/domain";
import { ListItem, YStack, Paragraph, Checkbox, XStack, Button } from "tamagui";
import { taskRepository } from "../../repositories";
import { TaskAddModal } from "./TaskAddModal";

interface TaskListProps {
  tasks: Task[];
  onToggleCompleted: (taskId: string) => void;
  userId: string;
}

export function TaskList({ tasks, onToggleCompleted, userId }: TaskListProps) {
  const handleAddTask = (
    title: string
  ) => {
    taskRepository.addTask(userId, title);
  };

  const header = (
    <XStack style={{ alignItems: "center", justifyContent: "space-between" }}>
      <YStack>
        <Paragraph size="$3" fontWeight="900" color="$color12">
          Tasks
        </Paragraph>
        <Paragraph size="$2" fontWeight="400" color="$color11">
          Stay on top of your day.
        </Paragraph>
      </YStack>
      <TaskAddModal onSubmit={handleAddTask} trigger={<Button size="$2" aria-label="Add task" circular>+</Button>} />
    </XStack>
  );

  return (
    <YStack gap="$2">
      {header}
      {tasks.length === 0 && (
        <Paragraph size="$2" color="$color11">
          No tasks yet.
        </Paragraph>
      )}
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
