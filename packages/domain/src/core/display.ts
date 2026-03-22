import { Period, HabitTimeOfDay } from "../models/habit";

/**
 * Formats a period key (e.g. "2026-W11", "2026-03", "2026-03-15") into a
 * short human-readable label without the year (used for streak "open since").
 */
export function formatPeriodKey(periodKey: string, period: Period): string {
  if (period === Period.WEEK) {
    const [, w] = periodKey.split("-W");
    return `Week ${parseInt(w, 10)}`;
  }
  if (period === Period.MONTH) {
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
export function formatPeriodKeyFull(periodKey: string, period: Period): string {
  if (period === Period.WEEK) {
    const [y, w] = periodKey.split("-W");
    return `Week ${parseInt(w, 10)}, ${y}`;
  }
  if (period === Period.MONTH) {
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

/** Sunday–Saturday single-character labels for weekday pickers. */
export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** Short display label for a period ("Today", "Week", "Month"). */
export function getPeriodLabel(period: Period): string {
  if (period === Period.DAY) return "Today";
  if (period === Period.WEEK) return "Week";
  return "Month";
}

/** Sort order for Period values. */
export const PERIOD_ORDER: Record<Period, number> = {
  [Period.DAY]: 0,
  [Period.WEEK]: 1,
  [Period.MONTH]: 2,
};

/** Valid time-of-day values in display order. */
export const TIME_OF_DAY_OPTIONS: readonly HabitTimeOfDay[] = [
  "morning",
  "afternoon",
  "evening",
];

/** Sort order for time-of-day values. */
export const TIME_OF_DAY_ORDER: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

/** Convert a period to itself (kept for call-site compatibility). */
export function scopeToPeriod(scope: Period): Period {
  return scope;
}

/** Period tab descriptor used by the period-tabs layout. */
export const PERIOD_TABS: { period: Period; scope: Period; label: string }[] = [
  { period: Period.DAY, scope: Period.DAY, label: "Day" },
  { period: Period.WEEK, scope: Period.WEEK, label: "Week" },
  { period: Period.MONTH, scope: Period.MONTH, label: "Month" },
];
