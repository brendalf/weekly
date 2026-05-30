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

export function computeStreak(
  summaryMap: Map<string, boolean>,
  referenceDate: Date,
  createdAt: Date,
  period: Period,
  skippedPeriods?: string[],
  activeDays?: number[],
): { currentStrikeLength: number; openSincePeriodKey: string | null } {
  const createdPeriodKey = periodKeyOf(createdAt, period);
  let streakCount = 0;
  let openSincePeriodKey: string | null = null;
  let current = prevPeriodDate(referenceDate, period);

  while (true) {
    const key = periodKeyOf(current, period);
    if (key < createdPeriodKey) break;

    // Check period key, week key, and month key (but NOT day keys — "skip today" is UI-only)
    if (skippedPeriods && (
      skippedPeriods.includes(key) ||
      skippedPeriods.includes(weekKeyOf(current)) ||
      skippedPeriods.includes(monthKeyOf(current))
    )) {
      current = prevPeriodDate(current, period);
      continue;
    }

    if (period === Period.DAY && activeDays && activeDays.length > 0) {
      if (!activeDays.includes(current.getDay())) {
        current = prevPeriodDate(current, period);
        continue;
      }
    }

    const succeeded = summaryMap.get(key) ?? false;

    if (succeeded) {
      if (openSincePeriodKey !== null) break;
      streakCount++;
    } else {
      if (streakCount > 0) break;
      openSincePeriodKey = key;
    }

    current = prevPeriodDate(current, period);
  }

  return { currentStrikeLength: streakCount, openSincePeriodKey };
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
