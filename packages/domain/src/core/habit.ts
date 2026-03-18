import { Habit, HabitPeriod, WeekId, Year } from "../models/habit";
import { periodKeyOf } from "./period";

export function filterHabitsByDay(habits: Habit[], day: Date): Habit[] {
  const selected = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return habits.filter((habit) => {
    const created = new Date(habit.createdAt);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    return createdDay <= selected;
  });
}

export function prevPeriodDate(date: Date, period: HabitPeriod): Date {
  const d = new Date(date);
  if (period === HabitPeriod.Day) d.setDate(d.getDate() - 1);
  else if (period === HabitPeriod.Week) d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d;
}

export function computeStreak(
  summaryMap: Map<string, boolean>,
  referenceDate: Date,
  createdAt: Date,
  period: HabitPeriod,
): { currentStrikeLength: number; openSincePeriodKey: string | null } {
  const createdPeriodKey = periodKeyOf(createdAt, period);
  let streakCount = 0;
  let openSincePeriodKey: string | null = null;
  let current = prevPeriodDate(referenceDate, period);

  while (true) {
    const key = periodKeyOf(current, period);
    if (key < createdPeriodKey) break;

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
 *
 * For now this relies on a simple ISO week calculation; you can refine to match
 * whatever calendar rules you use for your weekly files.
 */
export function isDateInWeek(dateISO: string, week: WeekId): boolean {
  const date = new Date(dateISO);
  const { year, week: weekNumber } = getISOWeek(date);
  return year === week.year && weekNumber === week.week;
}

/**
 * Compute ISO week number and year for a given date.
 * This matches the common ISO-8601 definition: weeks start on Monday, week 1 is
 * the week with the year's first Thursday.
 */
export function getISOWeek(date: Date): WeekId {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  // Thursday in current week decides the year.
  const dayNum = tmp.getUTCDay() || 7; // 1 (Mon) - 7 (Sun)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);

  const year = tmp.getUTCFullYear() as Year;

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7) as number;

  return { year, week };
}
