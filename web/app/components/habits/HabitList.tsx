"use client";

import { Habit, HabitPeriod } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { HabitItem } from "./HabitItem";
import { HabitAddModal } from "./HabitAddModal";
import { habitRepository } from "../../repositories";

interface HabitListProps {
  habits: Habit[];
  userId: string;
}

export function HabitList({ habits, userId }: HabitListProps) {
  const handleAddHabit = (name: string, times: number, period: HabitPeriod) => {
    habitRepository.addHabit(userId, name, times, period);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Habits</p>
          <p className="text-xs text-foreground/60">Build streaks with daily clarity.</p>
        </div>
        <HabitAddModal
          onSubmit={handleAddHabit}
          trigger={
            <Button size="sm" isIconOnly aria-label="Add habit" variant="ghost">
              <Plus />
            </Button>
          }
        />
      </div>

      {habits.length === 0 && (
        <p className="text-xs text-foreground/60">No habits yet.</p>
      )}
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          id={habit.id}
          name={habit.name}
          target={habit.times}
          period={habit.period}
          userId={userId}
        />
      ))}
    </div>
  );
}
