import { Period } from "../models/habit";
import type { ActivityNotification, ActivityType } from "../models/workspace";
import { formatDayKey, formatPeriodKey } from "./display";

const HABIT_MARK_TYPES: readonly ActivityType[] = [
  "habit_completed",
  "habit_progress",
];

/** True for the activity types produced by marking a habit. */
export function isHabitMarkActivity(type: ActivityType): boolean {
  return HABIT_MARK_TYPES.includes(type);
}

/** One row of the activity feed; habit marks of the same period are merged. */
export interface ActivityFeedEntry {
  key: string;
  activity: ActivityNotification;
  /** Days marked by a merged habit-mark entry, oldest first. Empty otherwise. */
  dayKeys: string[];
}

/**
 * Turns raw activity docs into feed rows, merging the habit marks one actor
 * made toward the same period: a 3×/week habit then reads as a single line
 * listing its three days instead of three near-identical notifications.
 *
 * Expects `activities` newest-first and preserves that order; the newest mark
 * of a group supplies the row's timestamp.
 */
export function buildActivityFeed(
  activities: ActivityNotification[],
): ActivityFeedEntry[] {
  const entries: ActivityFeedEntry[] = [];
  const byGroup = new Map<string, ActivityFeedEntry>();

  for (const activity of activities) {
    // Legacy marks carry no period, so they cannot be grouped meaningfully.
    if (!isHabitMarkActivity(activity.type) || !activity.periodKey) {
      entries.push({ key: activity.id, activity, dayKeys: [] });
      continue;
    }

    const groupKey = `${activity.actorUid}|${activity.itemId}|${activity.periodKey}`;
    const existing = byGroup.get(groupKey);
    if (!existing) {
      const entry: ActivityFeedEntry = {
        key: groupKey,
        activity,
        dayKeys: activity.dayKey ? [activity.dayKey] : [],
      };
      byGroup.set(groupKey, entry);
      entries.push(entry);
      continue;
    }

    // Keep the newest mark's identity and timestamp; fold in the completion
    // state and the days of the older marks.
    existing.activity = {
      ...existing.activity,
      type:
        existing.activity.type === "habit_completed" ||
        activity.type === "habit_completed"
          ? "habit_completed"
          : existing.activity.type,
      progressCount: Math.max(
        existing.activity.progressCount ?? 0,
        activity.progressCount ?? 0,
      ),
    };
    if (activity.dayKey && !existing.dayKeys.includes(activity.dayKey)) {
      existing.dayKeys.push(activity.dayKey);
    }
  }

  for (const entry of byGroup.values()) {
    entry.dayKeys.sort();
  }

  return entries;
}

/** "Mon 6" — compact enough to list several days on one line. */
function compactDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  const date = new Date(y, m - 1, d);
  return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${d}`;
}

function formatMarkedDays(dayKeys: string[]): string {
  if (dayKeys.length === 0) return "";
  if (dayKeys.length === 1) return formatDayKey(dayKeys[0]);
  return dayKeys.map(compactDayKey).join(", ");
}

/**
 * Secondary line for a habit mark: the period the mark counted toward, how far
 * that period got, and which days were marked — e.g.
 * "Week 11 · 2/3 · marked Mon 9, Wed 11".
 *
 * Returns null for legacy activity docs written before marks carried a period.
 */
export function formatHabitMarkDetail(entry: ActivityFeedEntry): string | null {
  const { activity } = entry;
  const period = activity.habitPeriod;
  if (!period || !activity.periodKey) return null;

  const dayKeys =
    entry.dayKeys.length > 0
      ? entry.dayKeys
      : activity.dayKey
        ? [activity.dayKey]
        : [];
  const days = formatMarkedDays(dayKeys);

  // A day habit's period *is* the day, so its day label needs no "marked" hint.
  const parts =
    period === Period.DAY
      ? [days || formatPeriodKey(activity.periodKey, period)]
      : [formatPeriodKey(activity.periodKey, period)];

  const target = activity.progressTarget ?? 0;
  if (target > 1 && activity.progressCount !== undefined) {
    parts.push(`${activity.progressCount}/${target}`);
  }
  if (period !== Period.DAY && days) parts.push(`marked ${days}`);

  return parts.join(" · ");
}
