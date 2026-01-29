"use client";

import { Habit, HabitPeriod } from "@weekly/domain";
import { Button, XStack, YStack, Paragraph } from "tamagui";
import { HabitItem } from "./HabitItem";
import { HabitAddModal } from "./HabitAddModal";
import { addHabbitRemote } from "../../stores/habbits";

interface HabitListProps {
  habits: Habit[];
  userId: string;
}

export function HabitList({ habits, userId }: HabitListProps) {
  function handleAddHabitModal(
    name: string,
    times: number,
    period: HabitPeriod
  ) {
    addHabbitRemote(userId, name, times, period);
  }

  const header = (
    <XStack style={{ alignItems: "center", justifyContent: "space-between" }}>
      <Paragraph size="$2" fontWeight="600">
        Habits
      </Paragraph>
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
        <Paragraph size="$2" color="$color10">
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
