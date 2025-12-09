"use client";

import { Habit } from "@weekly/domain";
import { YStack, Paragraph } from "tamagui";

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
    <YStack gap="$1">
      {habits.map((habit) => (
        <Paragraph key={habit.id} size="$2">
          {habit.name} (target: {habit.weeklyTarget}/week)
        </Paragraph>
      ))}
    </YStack>
  );
}
