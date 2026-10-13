"use client";

import { useEffect, useState } from "react";
import type { HabitStats, Period } from "@weekly/domain";
import { useRepositoryContext } from "../contexts/RepositoryContext";

/**
 * One habit's live record: streak, and how often it has been kept
 * (PLAN WS5).
 *
 * `/app/habits` shows a completion rate on every row and `/app/habits/:id`
 * shows it in the panel, so the subscription lives here rather than being
 * written out twice. It is the *same* listener the streak badge already used —
 * `subscribeHabitStreak` returns the whole `HabitStats` because both numbers
 * come out of one query over the habit's period summaries — so adding the rate
 * to a row costs nothing.
 *
 * Arrays arrive as fresh identities on every Firestore snapshot, so they are
 * serialized into the dependency list. Depending on them directly would tear
 * the listener down and rebuild it on every unrelated habit update.
 */
export interface UseHabitStatsOptions {
  habitId: string;
  period: Period;
  /** ISO date the habit was created — the start of its record. */
  createdAt: string;
  /** The period the row is showing. The current one is excluded from the rate. */
  referenceDate: Date;
  skippedPeriods?: string[];
  activeDays?: number[];
  /** Set false to skip the subscription entirely (a closed panel). */
  enabled?: boolean;
}

export function useHabitStats({
  habitId,
  period,
  createdAt,
  referenceDate,
  skippedPeriods,
  activeDays,
  enabled = true,
}: UseHabitStatsOptions): HabitStats | null {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(habitId);
  const [stats, setStats] = useState<HabitStats | null>(null);

  const skippedPeriodsKey = skippedPeriods?.join("\0") ?? "";
  const activeDaysKey = activeDays?.join(",") ?? "";

  useEffect(() => {
    if (!repos || !enabled) return;
    return repos.habitProgress.subscribeHabitStreak(
      habitId,
      period,
      new Date(createdAt),
      referenceDate,
      setStats,
      skippedPeriods,
      activeDays,
    );
    // `skippedPeriods` / `activeDays` are covered by their serialized keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    repos,
    enabled,
    habitId,
    period,
    createdAt,
    referenceDate,
    skippedPeriodsKey,
    activeDaysKey,
  ]);

  return stats;
}

/**
 * The completion rate as a whole percentage, or `null` when the habit has no
 * closed period yet. Rounded here so the row and the panel never disagree.
 */
export function completionPercent(stats: HabitStats | null): number | null {
  if (!stats || stats.completionRate === null) return null;
  return Math.round(stats.completionRate * 100);
}
