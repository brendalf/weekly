import type { Habit, HabitPeriod } from "../models/habit";
import type { Unsubscribe } from "./types";

export interface HabitCompletionLog {
  id: string;
  occurredAt?: string;
  dayKey?: string;
  weekKey?: string;
  monthKey?: string;
  periodKey?: string;
}

export interface HabitRepository {
  subscribeHabits(userId: string, onHabits: (habits: Habit[]) => void): Unsubscribe;
  addHabit(userId: string, name: string, times: number, period: HabitPeriod): Promise<void>;
  subscribeHabitCompletions(
    userId: string,
    habitId: string,
    onLogs: (logs: HabitCompletionLog[]) => void,
  ): Unsubscribe;
  deleteHabit(userId: string, habitId: string): Promise<void>;
  updateHabit(userId: string, habitId: string, name: string, times: number, period: HabitPeriod): Promise<void>;
  deleteHabitLog(userId: string, habitId: string, log: HabitCompletionLog, target: number): Promise<void>;
}
