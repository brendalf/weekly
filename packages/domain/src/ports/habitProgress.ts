import type { HabitPeriod } from "../models/habit";
import type { Unsubscribe } from "./types";

export interface HabitProgressRepository {
  subscribeHabitProgress(
    userId: string,
    habitId: string,
    period: HabitPeriod,
    referenceDate: Date,
    onProgress: (data: { count: number; dayCounts: Record<string, number> }) => void,
  ): Unsubscribe;

  subscribeHabitStreak(
    userId: string,
    habitId: string,
    period: HabitPeriod,
    createdAt: Date,
    referenceDate: Date,
    onStreak: (streak: { currentStrikeLength: number; openSincePeriodKey: string | null }) => void,
  ): Unsubscribe;

  incrementHabit(
    userId: string,
    habitId: string,
    period: HabitPeriod,
    target: number,
    referenceDate: Date,
  ): Promise<void>;
}
