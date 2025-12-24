"use client";

import { Habit } from "@weekly/domain";
import { YStack, Paragraph, ListItem } from "tamagui";

interface HabitListProps {
  habits: Habit[];
}

export function HabitList({ habits }: HabitListProps) {
  if (habits.length === 0) {
    return (
      <Paragraph size="$2" color="$color10">
        No habits yet. Add one above.
      </Paragraph>
    );
  }

  return (
    <YStack gap="$2">
      {habits.map((habit) => (
        <ListItem
          key={habit.id}
          title={habit.name}
          subTitle={`Target: ${habit.weeklyTarget}/week`}
          size="$3"
        />
      ))}
    </YStack>
  );
}
