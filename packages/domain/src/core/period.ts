import { HabitPeriod } from "../models/habit";

function pad(n: number, size = 2) {
  return String(n).padStart(size, "0");
}

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ISO week (Mon-Sun). Returns [isoYear, isoWeek]
function getISOWeek(date: Date): [number, number] {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = tmp.getUTCDay() || 7; // 1..7 (Mon..Sun)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return [tmp.getUTCFullYear(), weekNo];
}

export function weekKeyOf(date: Date): string {
  const [y, w] = getISOWeek(date);
  return `${y}-W${pad(w)}`;
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function periodKeyOf(date: Date, period: HabitPeriod): string {
  if (period === HabitPeriod.Day) return dayKeyOf(date);
  if (period === HabitPeriod.Week) return weekKeyOf(date);
  return monthKeyOf(date);
}
