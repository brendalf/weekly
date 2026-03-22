import { Habit, Period, WeekId, Year } from "../models/habit";
import { dayKeyOf, monthKeyOf, periodKeyOf, weekKeyOf } from "./period";

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

/** Returns true if the habit is skipped for the given day's period. */
export function isHabitSkipped(habit: Habit, day: Date): boolean {
  if (!habit.skippedPeriods || habit.skippedPeriods.length === 0) return false;
  return habit.skippedPeriods.includes(periodKeyOf(day, habit.period));
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
): { currentStrikeLength: number; openSincePeriodKey: string | null } {
  const createdPeriodKey = periodKeyOf(createdAt, period);
  let streakCount = 0;
  let openSincePeriodKey: string | null = null;
  let current = prevPeriodDate(referenceDate, period);

  while (true) {
    const key = periodKeyOf(current, period);
    if (key < createdPeriodKey) break;

    if (skippedPeriods?.includes(key)) {
      current = prevPeriodDate(current, period);
      continue;
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
  * Compute ISO week number and year for a given date.
  */
export function getISOWeek(date: Date): WeekId {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  const dayNum = tmp.getUTCDay() || 7; // 1 (Mon) - 7 (Sun)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);

  const year = tmp.getUTCFullYear() as Year;

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7) as number;

  return { year, week };
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
  * Returns period keys that should be skipped based on the skip type.
  */
export function getSkipPeriodKeys(
  date: Date,
  period: Period,
  skipType: 'today' | 'week' | 'month' | 'until',
  untilDate?: Date,
): string[] {
  if (skipType === 'today') {
    return [periodKeyOf(date, period)];
  }

  if (period !== Period.DAY) {
    if (skipType === 'week') return [weekKeyOf(date)];
    if (skipType === 'month') return [monthKeyOf(date)];
    if (skipType === 'until' && untilDate) {
      const keys: string[] = [];
      const d = new Date(date);
      while (d <= untilDate) {
        const key = periodKeyOf(d, period);
        if (!keys.includes(key)) keys.push(key);
        if (period === Period.WEEK) d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
      }
      return keys;
    }
    return [periodKeyOf(date, period)];
  }

  // Day period
  if (skipType === 'week') {
    const monday = getMondayOfWeek(date);
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      keys.push(dayKeyOf(d));
    }
    return keys;
  }

  if (skipType === 'month') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const keys: string[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      keys.push(dayKeyOf(d));
      d.setDate(d.getDate() + 1);
    }
    return keys;
  }

  if (skipType === 'until' && untilDate) {
    const keys: string[] = [];
    const d = new Date(date);
    while (d <= untilDate) {
      keys.push(dayKeyOf(d));
      d.setDate(d.getDate() + 1);
    }
    return keys;
  }

  return [periodKeyOf(date, period)];
}
