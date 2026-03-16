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
  subscribeHabits(onHabits: (habits: Habit[]) => void): Unsubscribe;
  addHabit(name: string, times: number, period: HabitPeriod): Promise<void>;
  subscribeHabitCompletions(
    habitId: string,
    onLogs: (logs: HabitCompletionLog[]) => void,
  ): Unsubscribe;
  deleteHabit(habitId: string): Promise<void>;
  updateHabit(
    habitId: string,
    name: string,
    times: number,
    period: HabitPeriod,
  ): Promise<void>;
  deleteHabitLog(
    habitId: string,
    log: HabitCompletionLog,
    target: number,
  ): Promise<void>;
}
