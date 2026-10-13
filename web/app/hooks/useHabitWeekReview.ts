"use client";

import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@weekly/domain";
import {
  compareHabitReviews,
  habitWeekPeriods,
  reviewHabitWeek,
  summarizeHabitWeek,
  type HabitReviewSummary,
  type HabitWeekReview,
} from "@weekly/domain";
import { useRepositoryContext } from "../contexts/RepositoryContext";

/**
 * Every habit's progress over one week, read **once** (PLAN WS8).
 *
 * `/app/review` is read-only, so it must not pay what a live row pays.
 * `HabitItem` opens two subscriptions per habit (`subscribeHabitProgress` +
 * `subscribeHabitStreak`) because a row has to repaint the instant someone in
 * the workspace marks something; a recap of a week does not. This instead does
 * one snapshot read per habit through `HabitProgressRepository.readHabitProgress`
 * and leaves nothing open — the same instinct as `HabitItem`'s
 * `readCompletionsOnce`, but pushed down into the repository where a one-shot
 * `getDocs` can do the job properly.
 *
 * All of the arithmetic lives in `@weekly/domain`'s `core/review.ts`; this hook
 * only decides *which* period keys to ask for and merges the answers.
 *
 * Failures are surfaced rather than swallowed: a recap that silently reports
 * every habit as missed because a read failed is worse than one that says it
 * could not load.
 */

export interface HabitWeekReviewState {
  /** One entry per habit, worst news first. Empty until the first read lands. */
  reviews: HabitWeekReview[];
  /** The week's rolled-up habit numbers. */
  summary: HabitReviewSummary;
  /** True until every habit's progress for this week has been read. */
  loading: boolean;
  /** True when at least one read failed; the numbers are then incomplete. */
  failed: boolean;
}

const EMPTY_SUMMARY: HabitReviewSummary = {
  committedHabits: 0,
  skippedHabits: 0,
  succeeded: 0,
  missed: 0,
  pending: 0,
  completionRate: null,
  streaksHeld: 0,
  streaksBroken: 0,
};

/**
 * Identity of the inputs that change the answer.
 *
 * Firestore hands out a fresh `habits` array on every snapshot, so depending
 * on the array itself would re-read the whole week each time anything in the
 * workspace moved. The signature only changes when something that actually
 * feeds the recap does.
 */
function signatureOf(habits: Habit[], weekStart: Date): string {
  const parts = habits.map((h) =>
    [
      h.id,
      h.period,
      h.times,
      h.createdAt,
      (h.activeDays ?? []).join("."),
      (h.skippedPeriods ?? []).join("."),
    ].join(":"),
  );
  return `${weekStart.getTime()}|${parts.join("|")}`;
}

export function useHabitWeekReview(
  habits: Habit[],
  weekStart: Date,
  /** "Now", so an unfinished period counts as pending rather than missed. */
  now: Date,
): HabitWeekReviewState {
  const { getHabitRepos } = useRepositoryContext();
  const signature = signatureOf(habits, weekStart);
  const nowTime = now.getTime();

  const [result, setResult] = useState<{
    signature: string;
    reviews: HabitWeekReview[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let failed = false;

      const reviews = await Promise.all(
        habits.map(async (habit) => {
          const periods = habitWeekPeriods(habit, weekStart);
          const marks = new Map<string, number>();

          // A habit the week asked nothing of needs no read at all.
          if (periods.length > 0) {
            const repos = getHabitRepos(habit.id);
            if (!repos) failed = true;
            else {
              try {
                const progress = await repos.habitProgress.readHabitProgress(
                  habit.id,
                  habit.period,
                  periods[0].key,
                  periods[periods.length - 1].key,
                );
                for (const entry of progress) {
                  marks.set(entry.periodKey, entry.count);
                }
              } catch {
                failed = true;
              }
            }
          }

          return reviewHabitWeek(habit, weekStart, new Date(nowTime), marks);
        }),
      );

      if (cancelled) return;
      reviews.sort(compareHabitReviews);
      setResult({ signature, reviews, failed });
    })();

    return () => {
      cancelled = true;
    };
    // `habits` is intentionally absent: `signature` stands in for its contents,
    // so a snapshot that changes the array's identity but not the recap's
    // inputs does not re-read every habit's week.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, nowTime, getHabitRepos]);

  const current = result?.signature === signature ? result : null;

  const summary = useMemo(
    () => (current ? summarizeHabitWeek(current.reviews) : EMPTY_SUMMARY),
    [current],
  );

  return {
    reviews: current?.reviews ?? [],
    summary,
    loading: current === null,
    failed: current?.failed ?? false,
  };
}
