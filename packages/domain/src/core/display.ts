import { HabitPeriod } from "../models/habit";

/**
 * Formats a period key (e.g. "2026-W11", "2026-03", "2026-03-15") into a
 * short human-readable label without the year (used for streak "open since").
 */
export function formatPeriodKey(periodKey: string, period: HabitPeriod): string {
  if (period === HabitPeriod.Week) {
    const [, w] = periodKey.split("-W");
    return `Week ${parseInt(w, 10)}`;
  }
  if (period === HabitPeriod.Month) {
    const [y, m] = periodKey.split("-");
    return new Date(+y, +m - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  const [y, m, d] = periodKey.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a period key with full year context (used for non-current periods).
 */
export function formatPeriodKeyFull(periodKey: string, period: HabitPeriod): string {
  if (period === HabitPeriod.Week) {
    const [y, w] = periodKey.split("-W");
    return `Week ${parseInt(w, 10)}, ${y}`;
  }
  if (period === HabitPeriod.Month) {
    const [y, m] = periodKey.split("-");
    return new Date(+y, +m - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  const [y, m, d] = periodKey.split("-");
  return `on ${new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

/**
 * Computes normalized progress (0–1) and completion flag for a habit.
 */
export function habitProgress(
  value: number,
  target: number,
): { progress: number; complete: boolean } {
  const complete = target > 0 && value >= target;
  const progress = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  return { progress, complete };
}

/**
 * Formats a date as the dashboard day label, e.g. "Monday, 15 of March".
 */
export function formatDayLabel(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${weekday}, ${day} of ${month}`;
}
