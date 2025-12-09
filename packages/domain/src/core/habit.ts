import {
  Habit,
  HabitDayLog,
  WeeklyHabitProgress,
  WeekId,
  Year,
} from "../models/habit";

export function isHabitSucceeded(count: number, target: number): boolean {
  if (target <= 0) return false;
  return count >= target;
}

/**
 * Compute weekly progress for a habit from its day logs.
 */
export function computeWeeklyProgressFromDayLogs(
  habit: Habit,
  week: WeekId,
  dayLogs: HabitDayLog[],
): WeeklyHabitProgress {
  const { id: habitId, weeklyTarget } = habit;

  // Count distinct dates in this week for this habit
  const dates = new Set(
    dayLogs
      .filter((log) => log.habitId === habitId)
      .filter((log) => isDateInWeek(log.date, week))
      .map((log) => log.date),
  );

  const count = dates.size;
  const target = weeklyTarget;
  const succeeded = isHabitSucceeded(count, target);

  return {
    habitId,
    year: week.year,
    week: week.week,
    count,
    target,
    succeeded,
  };
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
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // Thursday in current week decides the year.
  const dayNum = tmp.getUTCDay() || 7; // 1 (Mon) - 7 (Sun)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);

  const year = tmp.getUTCFullYear() as Year;

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7) as number;

  return { year, week };
}
