import { Habit, Period } from "../models/habit";
import { addDays, getWeekDays } from "./date";
import { filterHabitsByDay, isHabitSkipped, isHabitSucceeded } from "./habit";
import { dayKeyOf, monthKeyOf, periodKeyOf, weekKeyOf } from "./period";

/**
 * The weekly close's domain (PLAN WS8).
 *
 * `/app/review` recaps a week that is already over — or one still running —
 * and the habit half of that recap is the part the route could not answer
 * before: *did I keep what I committed to, and where did a streak break?*
 *
 * Everything here is pure. The route hands in the habits it already has and a
 * map of period key → marks recorded, read **once** per habit (no live
 * listener per row — DIRECTION §8's cost note and the read-only rule), and
 * gets back numbers it only has to paint.
 *
 * Three ideas carry the whole module:
 *
 * 1. **A week asks a habit for a number of periods.** A daily habit is asked
 *    once per active day, a weekly habit once, a monthly habit once for the
 *    month the week belongs to. {@link habitWeekPeriods} is that list.
 * 2. **A period that has not finished yet is `pending`, not missed.** Reviewing
 *    the current week on Wednesday must not score Friday as a failure, so the
 *    "now" the caller passes in decides what counts as settled.
 * 3. **A skipped period left the denominator.** Skipping is calling a
 *    commitment off, which is exactly what `scopeProgress` already assumes in
 *    `week.ts`; the same rule applies here so the two surfaces cannot drift.
 */

/* -------------------------------------------------------------------------- */
/* The periods a week asks of a habit                                         */
/* -------------------------------------------------------------------------- */

/** One period of a habit that falls inside the week under review. */
export interface HabitWeekPeriod {
  /** `periodKeyOf(date, habit.period)` — the key its progress doc is filed under. */
  key: string;
  /** A date inside the period, for skip checks and labels. */
  date: Date;
  /** The user called this period off; it leaves the denominator. */
  skipped: boolean;
}

/**
 * The periods the week beginning `weekStart` asks of `habit`.
 *
 * - **Daily**: one entry per day of the week the habit was already created for
 *   and is active on (`activeDays`).
 * - **Weekly**: one entry, the week itself, if the habit existed by the end of
 *   the week.
 * - **Monthly**: one entry, the month that owns this ISO week (the month of
 *   its Thursday), so a week straddling two months is counted once — against
 *   the month the week itself belongs to.
 *
 * Returns `[]` for a habit that did not exist yet, which is what keeps a habit
 * created on Friday from being scored for Monday through Thursday.
 */
export function habitWeekPeriods(
  habit: Habit,
  weekStart: Date,
): HabitWeekPeriod[] {
  const days = getWeekDays(weekStart);

  if (habit.period === Period.DAY) {
    return days
      .filter((day) => filterHabitsByDay([habit], day).length > 0)
      .map((day) => ({
        key: dayKeyOf(day),
        date: day,
        skipped: isHabitSkipped(habit, day),
      }));
  }

  // Weekly and monthly habits are asked once. A habit created mid-week still
  // owes the week — the period it belongs to has not closed yet.
  const weekEnd = addDays(weekStart, 6);
  const created = new Date(habit.createdAt);
  if (Number.isNaN(created.getTime())) return [];
  const createdDay = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate(),
  );
  if (createdDay > weekEnd) return [];

  // Thursday decides which month an ISO week belongs to, the same rule
  // `getISOWeek` uses to decide its year.
  const reference = habit.period === Period.MONTH ? addDays(weekStart, 3) : weekStart;
  const key =
    habit.period === Period.MONTH ? monthKeyOf(reference) : weekKeyOf(reference);

  return [{ key, date: reference, skipped: isHabitSkipped(habit, reference) }];
}

/**
 * True once the period keyed `key` can be judged — i.e. it ended before `now`.
 *
 * Keys are comparable as strings within one period type (`2026-03-09`,
 * `2026-W11`, `2026-03` all sort chronologically), so "is it over" is just
 * "is it before the key `now` falls in".
 */
function isPeriodSettled(key: string, period: Period, now: Date): boolean {
  return key < periodKeyOf(now, period);
}

/* -------------------------------------------------------------------------- */
/* One habit's week                                                           */
/* -------------------------------------------------------------------------- */

/** Whether the week kept a habit's chain going. */
export type StreakOutcome =
  /** Every period the week asked for was met. */
  | "held"
  /** At least one settled period went unmet. */
  | "broken"
  /** Nothing has settled yet (the week is still running), or nothing was asked. */
  | "open";

/** How one habit did over the week under review. */
export interface HabitWeekReview {
  habitId: string;
  name: string;
  period: Period;
  /** Marks the habit asks for per period (`habit.times`). */
  target: number;
  /** Periods the week committed to, skips excluded. */
  committed: number;
  /** Periods inside the week the user called off. */
  skipped: number;
  /** Settled periods that met the target. */
  succeeded: number;
  /** Settled periods that did not. */
  missed: number;
  /** Committed periods that have not finished yet. */
  pending: number;
  /** Marks recorded across the committed periods. */
  marks: number;
  /** Marks the committed periods asked for (`committed × target`). */
  marksTarget: number;
  /** `succeeded / (succeeded + missed)`, or `null` while nothing has settled. */
  completionRate: number | null;
  streak: StreakOutcome;
}

/**
 * Scores one habit against the week beginning `weekStart`.
 *
 * `marksByPeriodKey` is the habit's own progress, keyed exactly as
 * {@link habitWeekPeriods} keys its periods; a key with no entry means no
 * marks, which is the common case and must not cost a read.
 *
 * `now` decides what has settled — pass the real clock, not the week, so that
 * reviewing the current week reports today as pending rather than missed.
 */
export function reviewHabitWeek(
  habit: Habit,
  weekStart: Date,
  now: Date,
  marksByPeriodKey: ReadonlyMap<string, number>,
): HabitWeekReview {
  const periods = habitWeekPeriods(habit, weekStart);
  const target = Math.max(1, habit.times);

  let committed = 0;
  let skipped = 0;
  let succeeded = 0;
  let missed = 0;
  let pending = 0;
  let marks = 0;

  for (const period of periods) {
    if (period.skipped) {
      skipped++;
      continue;
    }
    committed++;
    const count = marksByPeriodKey.get(period.key) ?? 0;
    marks += Math.min(count, target);

    if (isHabitSucceeded(count, target)) succeeded++;
    else if (isPeriodSettled(period.key, habit.period, now)) missed++;
    else pending++;
  }

  const settled = succeeded + missed;

  return {
    habitId: habit.id,
    name: habit.name,
    period: habit.period,
    target,
    committed,
    skipped,
    succeeded,
    missed,
    pending,
    marks,
    marksTarget: committed * target,
    completionRate: settled === 0 ? null : succeeded / settled,
    streak: missed > 0 ? "broken" : succeeded > 0 ? "held" : "open",
  };
}

/* -------------------------------------------------------------------------- */
/* The week                                                                   */
/* -------------------------------------------------------------------------- */

/** The habit half of the weekly recap. */
export interface HabitReviewSummary {
  /** Habits the week asked something of. */
  committedHabits: number;
  /** Habits with at least one period called off inside the week. */
  skippedHabits: number;
  /** Periods met, across every habit. */
  succeeded: number;
  /** Settled periods that went unmet, across every habit. */
  missed: number;
  /** Committed periods still running. */
  pending: number;
  /** `succeeded / (succeeded + missed)`, or `null` while nothing has settled. */
  completionRate: number | null;
  /** Habits that met everything the week asked of them. */
  streaksHeld: number;
  /** Habits that let a settled period lapse. */
  streaksBroken: number;
}

/**
 * Rolls per-habit reviews into the week's numbers.
 *
 * The rate is computed over **periods**, not habits, so a daily habit missed
 * twice weighs twice as much as one missed once — which is the only reading
 * under which "70% of what you committed to" means anything.
 */
export function summarizeHabitWeek(
  reviews: readonly HabitWeekReview[],
): HabitReviewSummary {
  let committedHabits = 0;
  let skippedHabits = 0;
  let succeeded = 0;
  let missed = 0;
  let pending = 0;
  let streaksHeld = 0;
  let streaksBroken = 0;

  for (const review of reviews) {
    if (review.committed > 0) committedHabits++;
    if (review.skipped > 0) skippedHabits++;
    succeeded += review.succeeded;
    missed += review.missed;
    pending += review.pending;
    if (review.streak === "held") streaksHeld++;
    if (review.streak === "broken") streaksBroken++;
  }

  const settled = succeeded + missed;

  return {
    committedHabits,
    skippedHabits,
    succeeded,
    missed,
    pending,
    completionRate: settled === 0 ? null : succeeded / settled,
    streaksHeld,
    streaksBroken,
  };
}

/**
 * Sorts the recap: the habits that need attention first (broken, then still
 * open), then the ones that held, then by name. A review is read top-down and
 * the top is where the misses belong.
 */
export function compareHabitReviews(
  a: HabitWeekReview,
  b: HabitWeekReview,
): number {
  const rank = (r: HabitWeekReview) =>
    r.streak === "broken" ? 0 : r.streak === "open" ? 1 : 2;
  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;
  return a.name.localeCompare(b.name);
}

/**
 * How a habit's week reads in one line: `"4/5 days"`, `"2/3 marks this week"`.
 *
 * Daily habits are counted in days because that is the commitment — one entry
 * per day, whatever the per-day target. A weekly or monthly habit only has one
 * period, so its marks are the only number with any resolution.
 */
export function habitWeekProgressLabel(review: HabitWeekReview): string {
  if (review.period === Period.DAY) {
    const unit = review.committed === 1 ? "day" : "days";
    return `${review.succeeded}/${review.committed} ${unit}`;
  }
  const unit = review.marksTarget === 1 ? "mark" : "marks";
  const span = review.period === Period.WEEK ? "this week" : "this month";
  return `${review.marks}/${review.marksTarget} ${unit} ${span}`;
}
