"use client";

import { Habit, HabitPeriod } from "@weekly/domain";
import { Button, XStack, YStack, Paragraph } from "tamagui";
import { HabitItem } from "./HabitItem";
import { HabitAddModal } from "./HabitAddModal";
import { habitRepository } from "../../repositories";

interface HabitListProps {
  habits: Habit[];
  userId: string;
}

export function HabitList({ habits, userId }: HabitListProps) {
  const handleAddHabitModal = (
    name: string,
    times: number,
    period: HabitPeriod
  ) => {
    habitRepository.addHabit(userId, name, times, period);
  }

  const header = (
    <XStack style={{ alignItems: "center", justifyContent: "space-between" }}>
      <YStack>
        <Paragraph size="$3" fontWeight="900" color="$color12">
          Habits
        </Paragraph>
        <Paragraph size="$2" fontWeight="400" color="$color11">
          Build streaks with daily clarity.
        </Paragraph>
      </YStack>
      <HabitAddModal
        onSubmit={handleAddHabitModal}
        trigger={
          <Button
            size="$2"
            aria-label="Add habit"
            circular
          >
            +
          </Button>
        }
      />
    </XStack>
  );

  return (
    <YStack gap="$2">
      {header}
      {habits.length === 0 && (
        <Paragraph size="$2" color="$color11">
          No habits yet.
        </Paragraph>
      )}
      {habits.map((habit) => {
        return (
          <HabitItem
            key={habit.id}
            id={habit.id}
            name={habit.name}
            target={habit.times}
            period={habit.period}
            userId={userId}
          />
        );
      })}
    </YStack>
  );
}
