import type { Period } from "../models/habit";
import type { Unsubscribe } from "./types";

export interface HabitProgressRepository {
  subscribeHabitProgress(
    habitId: string,
    period: Period,
    referenceDate: Date,
    onProgress: (data: { count: number; dayCounts: Record<string, number> }) => void,
  ): Unsubscribe;

  subscribeHabitStreak(
    habitId: string,
    period: Period,
    createdAt: Date,
    referenceDate: Date,
    onStreak: (streak: {
      currentStrikeLength: number;
      openSincePeriodKey: string | null;
    }) => void,
    skippedPeriods?: string[],
    activeDays?: number[],
  ): Unsubscribe;

  incrementHabit(
    habitId: string,
    period: Period,
    target: number,
    referenceDate: Date,
  ): Promise<void>;
}
