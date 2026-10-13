import { Habit, Period, WeekId } from "../models/habit";
import { dayKeyOf, getISOWeek, monthKeyOf, periodKeyOf, weekKeyOf } from "./period";
export { getISOWeek } from "./period";

export function filterHabitsByDay(habits: Habit[], day: Date): Habit[] {
  const selected = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return habits.filter((habit) => {
    const created = new Date(habit.createdAt);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    if (createdDay > selected) return false;

    if (habit.activeDays && habit.activeDays.length > 0) {
      if (!habit.activeDays.includes(day.getDay())) return false;
    }

    return true;
  });
}

/** Returns true if the habit is skipped for the given day (checks day, week, and month keys). */
export function isHabitSkipped(habit: Habit, day: Date): boolean {
  if (!habit.skippedPeriods || habit.skippedPeriods.length === 0) return false;
  const dayKey = dayKeyOf(day);
  const weekKey = weekKeyOf(day);
  const monthKey = monthKeyOf(day);
  return habit.skippedPeriods.some((k) => k === dayKey || k === weekKey || k === monthKey);
}

export function prevPeriodDate(date: Date, period: Period): Date {
  const d = new Date(date);
  if (period === Period.DAY) d.setDate(d.getDate() - 1);
  else if (period === Period.WEEK) d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d;
}

/**
 * Safety stop for the backwards walk over a habit's history. 1500 iterations is
 * four years of days, 28 years of weeks, 125 years of months — past any real
 * habit, and it keeps a corrupt `createdAt` from spinning forever.
 */
const MAX_PERIODS_SCANNED = 1500;

/**
 * The periods a habit was actually *on the hook* for, most recent first.
 *
 * Walks back from the period before `referenceDate` (the current one is still
 * open, so it can be neither held nor missed) to the one the habit was created
 * in, dropping every period the habit was excused from: an explicit skip, or a
 * weekday outside `activeDays`. What comes back is the denominator both the
 * streak and the completion rate are measured against.
 */
function eligiblePeriods(
  summaryMap: Map<string, boolean>,
  referenceDate: Date,
  createdAt: Date,
  period: Period,
  skippedPeriods?: string[],
  activeDays?: number[],
): { key: string; succeeded: boolean }[] {
  const createdPeriodKey = periodKeyOf(createdAt, period);
  const periods: { key: string; succeeded: boolean }[] = [];
  let current = prevPeriodDate(referenceDate, period);

  for (let scanned = 0; scanned < MAX_PERIODS_SCANNED; scanned++) {
    const key = periodKeyOf(current, period);
    if (key < createdPeriodKey) break;

    // Check period key, week key, and month key (but NOT day keys — "skip today" is UI-only)
    const isSkipped =
      skippedPeriods !== undefined &&
      (skippedPeriods.includes(key) ||
        skippedPeriods.includes(weekKeyOf(current)) ||
        skippedPeriods.includes(monthKeyOf(current)));

    const isInactiveWeekday =
      period === Period.DAY &&
      activeDays !== undefined &&
      activeDays.length > 0 &&
      !activeDays.includes(current.getDay());

    if (!isSkipped && !isInactiveWeekday) {
      periods.push({ key, succeeded: summaryMap.get(key) ?? false });
    }

    current = prevPeriodDate(current, period);
  }

  return periods;
}

/**
 * Everything a habit row needs to state its record: the live streak, and how
 * often the habit has been kept overall.
 *
 * Both numbers come from one backwards walk over the same period summaries, so
 * `/app/habits` gets the completion rate off the subscription it already has
 * for the streak rather than opening a second one per row.
 *
 * The rate deliberately counts only **elapsed** periods and only periods the
 * habit was eligible for: a habit skipped for a holiday week is not punished
 * for it, and today does not count as a miss before the day is over.
 */
export interface HabitStats {
  /** Consecutive eligible periods met, counting back from the last closed one. */
  currentStrikeLength: number;
  /** Earliest period of the current unbroken miss, or `null` when on track. */
  openSincePeriodKey: string | null;
  /** Eligible periods that have fully elapsed since the habit was created. */
  periodsElapsed: number;
  /** How many of those met the habit's target. */
  periodsCompleted: number;
  /**
   * `periodsCompleted / periodsElapsed`, 0–1. `null` — not `0` — when no
   * period has elapsed yet, so a habit created today reads "no history" rather
   * than "0%".
   */
  completionRate: number | null;
}

export function computeHabitStats(
  summaryMap: Map<string, boolean>,
  referenceDate: Date,
  createdAt: Date,
  period: Period,
  skippedPeriods?: string[],
  activeDays?: number[],
): HabitStats {
  const periods = eligiblePeriods(
    summaryMap,
    referenceDate,
    createdAt,
    period,
    skippedPeriods,
    activeDays,
  );

  let streakCount = 0;
  let openSincePeriodKey: string | null = null;
  let periodsCompleted = 0;
  // The streak reads only the most recent run of periods; once that run ends
  // it freezes, while the walk continues for the all-time rate.
  let streakSettled = false;

  for (const { key, succeeded } of periods) {
    if (succeeded) periodsCompleted++;
    if (streakSettled) continue;

    if (succeeded) {
      if (openSincePeriodKey !== null) streakSettled = true;
      else streakCount++;
    } else {
      if (streakCount > 0) streakSettled = true;
      else openSincePeriodKey = key;
    }
  }

  return {
    currentStrikeLength: streakCount,
    openSincePeriodKey,
    periodsElapsed: periods.length,
    periodsCompleted,
    completionRate:
      periods.length === 0 ? null : periodsCompleted / periods.length,
  };
}

/**
 * The streak half of {@link computeHabitStats}, kept as its own name because
 * that is what most callers ask for.
 */
export function computeStreak(
  summaryMap: Map<string, boolean>,
  referenceDate: Date,
  createdAt: Date,
  period: Period,
  skippedPeriods?: string[],
  activeDays?: number[],
): { currentStrikeLength: number; openSincePeriodKey: string | null } {
  const { currentStrikeLength, openSincePeriodKey } = computeHabitStats(
    summaryMap,
    referenceDate,
    createdAt,
    period,
    skippedPeriods,
    activeDays,
  );
  return { currentStrikeLength, openSincePeriodKey };
}

export function isHabitSucceeded(count: number, target: number): boolean {
  if (target <= 0) return false;
  return count >= target;
}

/**
  * Very small helper that lets us check if an ISO date belongs to a given Year/Week.
  */
export function isDateInWeek(dateISO: string, week: WeekId): boolean {
  const date = new Date(dateISO);
  const { year, week: weekNumber } = getISOWeek(date);
  return year === week.year && weekNumber === week.week;
}


/**
 * Returns period keys that should be skipped based on the skip type.
 * Key granularity is determined by the skip type, not the habit period:
 * - 'today'  → single day key (visual-only hide; does not affect streak)
 * - 'week'   → single week key
 * - 'month'  → single month key
 * - 'until'  → period-appropriate keys from date to untilDate (pass `period` arg)
 */
export function getSkipPeriodKeys(
  date: Date,
  skipType: 'today' | 'week' | 'month' | 'until',
  untilDate?: Date,
  period?: Period,
): string[] {
  if (skipType === 'today') return [dayKeyOf(date)];
  if (skipType === 'week') return [weekKeyOf(date)];
  if (skipType === 'month') return [monthKeyOf(date)];

  if (skipType === 'until' && untilDate) {
    const effectivePeriod = period ?? Period.DAY;
    const keys: string[] = [];
    const d = new Date(date);
    if (effectivePeriod === Period.WEEK) {
      while (d <= untilDate) {
        const key = weekKeyOf(d);
        if (!keys.includes(key)) keys.push(key);
        d.setDate(d.getDate() + 7);
      }
    } else if (effectivePeriod === Period.MONTH) {
      while (d <= untilDate) {
        const key = monthKeyOf(d);
        if (!keys.includes(key)) keys.push(key);
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      while (d <= untilDate) {
        keys.push(dayKeyOf(d));
        d.setDate(d.getDate() + 1);
      }
    }
    return keys;
  }

  return [dayKeyOf(date)];
}

/** Returns the key in skippedPeriods that covers the given day (most specific first). */
export function getActiveSkipKey(skippedPeriods: string[], day: Date): string | null {
  if (!skippedPeriods.length) return null;
  const dayKey = dayKeyOf(day);
  const weekKey = weekKeyOf(day);
  const monthKey = monthKeyOf(day);
  if (skippedPeriods.includes(dayKey)) return dayKey;
  if (skippedPeriods.includes(weekKey)) return weekKey;
  if (skippedPeriods.includes(monthKey)) return monthKey;
  return null;
}
