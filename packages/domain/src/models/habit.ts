export type Year = number;
export type WeekOfYear = number; // 1-53

export type HabitId = string;

export enum HabitPeriod {
  Day = "day",
  Week = "week",
  Month = "month",
}

export interface Habit {
  id: HabitId;
  name: string;
  times: number;
  period: HabitPeriod;
  createdAt: string;
  /** 0=Sun … 6=Sat. Absent/empty → all days active (only relevant for Day period). */
  activeDays?: number[];
  /** Period keys (from periodKeyOf) for which the habit is skipped. */
  skippedPeriods?: string[];
}

export interface WeekId {
  year: Year;
  week: WeekOfYear;
}

export interface HabitDayLog {
  habitId: HabitId;
  /** ISO date string (YYYY-MM-DD), day when the habit was completed */
  date: string;
  /** Optional link to underlying tasks that fulfilled this habit on that day */
  taskIds?: string[];
}

export interface WeeklyHabitProgress {
  habitId: HabitId;
  year: Year;
  week: WeekOfYear;
  /** number of distinct days completed this week */
  count: number;
  /** target completions for the week, usually Habit.weeklyTarget */
  target: number;
  succeeded: boolean;
}

export interface HabitStreak {
  habitId: HabitId;
  /** consecutive succeeded weeks up to and including the current week */
  currentStrikeLength: number;
  lastCompletedWeek: WeekId | null;
  /**
   * If currently failing: week from which the habit has been "open".
   * If currently succeeding: null.
   */
  openSinceWeek: WeekId | null;
}

export interface HabitYearStats {
  habitId: HabitId;
  year: Year;
  completedWeeks: number;
  totalWeeks: number;
  /** completedWeeks / totalWeeks (0-1) */
  completionRate: number;
}
