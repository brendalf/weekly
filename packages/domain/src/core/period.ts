import { Period, WeekId, Year } from "../models/habit";

function pad(n: number, size = 2) {
  return String(n).padStart(size, "0");
}

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO week (Mon-Sun). Returns { year, week }. */
export function getISOWeek(date: Date): WeekId {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7; // 1..7 (Mon..Sun)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum); // nearest Thursday
  const year = tmp.getUTCFullYear() as Year;
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

export function weekKeyOf(date: Date): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${pad(week)}`;
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function periodKeyOf(date: Date, period: Period): string {
  if (period === Period.DAY) return dayKeyOf(date);
  if (period === Period.WEEK) return weekKeyOf(date);
  return monthKeyOf(date);
}
