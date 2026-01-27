"use client";

import { Habit, HabitPeriod } from "@weekly/domain";
import { YStack, Paragraph } from "tamagui";
import { HabitItem } from "./HabitItem";

interface HabitListProps {
  habits: Habit[];
  userId: string;
}

export function HabitList({ habits, userId }: HabitListProps) {
  if (habits.length === 0) {
    return (
      <Paragraph size="$2" color="$color10">
        No habits yet. Add one above.
      </Paragraph>
    );
  }

  return (
    <YStack gap="$2">
      {habits.map((habit) => {
        const target = (habit as any).times ?? (habit as any).weeklyTarget ?? 1;
        const p = (habit as any).period;
        const period: HabitPeriod =
          p === "day" ? HabitPeriod.Day
          : p === "month" ? HabitPeriod.Month
          : HabitPeriod.Week;
        return (
          <HabitItem
            key={habit.id}
            id={habit.id}
            name={habit.name}
            target={target}
            period={period}
            userId={userId}
          />
        );
      })}
    </YStack>
  );
}
