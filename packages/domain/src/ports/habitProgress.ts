import type { HabitStats } from "../core/habit";
import type { Period } from "../models/habit";
import type { Unsubscribe } from "./types";

/** One habit's progress for one period, as stored. */
export interface HabitPeriodProgress {
  habitId: string;
  period: Period;
  /** `periodKeyOf(date, period)` — "2026-03-15", "2026-W11" or "2026-03". */
  periodKey: string;
  /** Marks recorded in the period. */
  count: number;
  /** Whether `count` met the habit's target when the mark landed. */
  succeeded: boolean;
}

export interface HabitProgressRepository {
  subscribeHabitProgress(
    habitId: string,
    period: Period,
    referenceDate: Date,
    onProgress: (data: { count: number; dayCounts: Record<string, number> }) => void,
  ): Unsubscribe;

  /**
   * One habit's record, live: the streak plus the all-time completion rate.
   *
   * Both come out of the same query over the habit's period summaries, which is
   * why the rate rides along here instead of on a listener of its own — a
   * management list like `/app/habits` shows the rate on every row.
   */
  subscribeHabitStreak(
    habitId: string,
    period: Period,
    createdAt: Date,
    referenceDate: Date,
    onStats: (stats: HabitStats) => void,
    skippedPeriods?: string[],
    activeDays?: number[],
  ): Unsubscribe;

  /**
   * Reads one habit's progress over a closed range of period keys, **once**.
   *
   * For read-only surfaces that need many habits at a time — `/app/review`
   * recaps every habit of a week — where `subscribeHabitProgress` would mean
   * one live listener per habit and per period (seven, for a daily habit).
   * This is a single snapshot read per habit and leaves nothing open.
   *
   * Both bounds are inclusive. Keys sort chronologically inside one period
   * type, so the range is a plain string range.
   */
  readHabitProgress(
    habitId: string,
    period: Period,
    fromPeriodKey: string,
    toPeriodKey: string,
  ): Promise<HabitPeriodProgress[]>;

  incrementHabit(
    habitId: string,
    period: Period,
    target: number,
    referenceDate: Date,
    currentCount: number,
    currentDayCounts: Record<string, number>,
  ): Promise<void>;
}
