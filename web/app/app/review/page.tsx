"use client";

import { useMemo, useState } from "react";
import {
  Period,
  addDays,
  getISOWeek,
  getTaskVisibility,
  getWeekDays,
  habitWeekProgressLabel,
  weekRangeLabel,
  type HabitWeekReview,
  type Task,
} from "@weekly/domain";
import { CircleCheck, Circle } from "@gravity-ui/icons";
import { EmptyState, SkeletonList } from "../../components/ui";
import { Badge } from "../../components/general/Badge";
import { PeriodBadge } from "../../components/general/PeriodBadge";
import { useAppData } from "../../components/shell/AppDataProvider";
import { WeekPicker } from "../../components/calendar/WeekPicker";
import { useCalendarStore } from "../../stores/calendar";
import { useHabitWeekReview } from "../../hooks/useHabitWeekReview";

/**
 * `/app/review` — the weekly close, read-only (DIRECTION §3).
 *
 * The week under review is whichever week the shell is on: `calendarStore` is
 * global, so picking Thursday on `/app/week` and coming here reviews that week.
 *
 * The habit half (completion rate, streaks held vs. broken) comes from
 * `useHabitWeekReview`, which reads each habit's period progress **once** —
 * `/app/review` must not pay for one live listener per habit — and scores it in
 * `@weekly/domain`'s `core/review.ts`. Nothing is computed here; this file only
 * paints.
 *
 * **The route is read-only on purpose.** Carry-over actions — "move all open
 * tasks to next week" — are explicitly out of scope (DIRECTION §8), so an open
 * task is reported, never operated on. Rows here are deliberately not
 * `HabitItem` / `TaskItem`: nothing on this page is clickable, and a row that
 * looks operable but is not would be worse than a plain one.
 */
export default function ReviewPage() {
  const { habits, tasks, notes } = useAppData();
  const weekStart = useCalendarStore((s) => s.weekStart);

  // One clock for the lifetime of the page: an unfinished period must count as
  // pending rather than missed, and a `new Date()` per render would re-read
  // every habit's week on every repaint.
  const [now] = useState(() => new Date());

  const { year, week } = getISOWeek(weekStart);
  const {
    reviews,
    summary: habitSummary,
    loading: habitsLoading,
    failed: habitsFailed,
  } = useHabitWeekReview(habits, weekStart, now);

  // A habit that did not exist yet, or does not run in this week, has nothing
  // to report — listing it as "not due" would pad the recap with non-news.
  const dueHabits = reviews.filter((r) => r.committed > 0 || r.skipped > 0);

  const recap = useMemo(() => {
    const days = getWeekDays(weekStart);
    const weekEnd = addDays(weekStart, 7);

    // A task is in this week if any of its days put it in play.
    const inWeek: Task[] = tasks.filter((task) =>
      days.some((day) => getTaskVisibility(task, day) === "current"),
    );
    const completed = inWeek.filter((t) => t.completed);
    const open = inWeek.filter((t) => !t.completed);

    // Tasks from an earlier period that are still open at the end of the week.
    // A day-scoped task from Wednesday is "past open" by Sunday but is already
    // in `open` above — a recap that lists the same task twice is noise.
    const inWeekIds = new Set(inWeek.map((t) => t.id));
    const carried = tasks.filter(
      (task) =>
        !task.completed &&
        !inWeekIds.has(task.id) &&
        getTaskVisibility(task, addDays(weekStart, 6)) === "past_open",
    );

    const startISO = weekStart.toISOString();
    const endISO = weekEnd.toISOString();
    const notesAdded = notes.filter(
      (n) => n.createdAt >= startISO && n.createdAt < endISO,
    );

    return { completed, open, carried, notesAdded: notesAdded.length };
  }, [tasks, notes, weekStart]);

  const nothingHappened =
    !habitsLoading &&
    habitSummary.committedHabits === 0 &&
    recap.completed.length === 0 &&
    recap.open.length === 0 &&
    recap.carried.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <WeekPicker />
        {/* The picker already names the week; this adds the dates it covers,
            which is what tells you whether you are looking at the right one. */}
        <p className="text-sm text-muted">
          {weekRangeLabel(weekStart)} · week {week} of {year}
        </p>
      </div>

      {nothingHappened ? (
        <EmptyState
          headline="Nothing to review in this week"
          body="Pick another week above, or plan this one from the week planner."
        />
      ) : (
        <>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <Stat
              label="Habits kept"
              value={
                habitSummary.completionRate === null
                  ? "—"
                  : `${Math.round(habitSummary.completionRate * 100)}%`
              }
              hint={
                habitSummary.completionRate === null
                  ? "nothing has finished yet"
                  : `${habitSummary.succeeded} of ${
                      habitSummary.succeeded + habitSummary.missed
                    } committed periods`
              }
            />
            <Stat
              label="Streaks held"
              value={habitSummary.streaksHeld}
              hint={`of ${habitSummary.committedHabits} habits`}
            />
            {habitSummary.streaksBroken > 0 && (
              <Stat label="Streaks broken" value={habitSummary.streaksBroken} />
            )}
            <Stat label="Tasks completed" value={recap.completed.length} />
            <Stat label="Tasks still open" value={recap.open.length} />
            {recap.notesAdded > 0 && (
              <Stat label="Notes added" value={recap.notesAdded} />
            )}
          </dl>

          {habitsFailed && (
            <p className="text-sm text-warning-muted" role="status">
              Some habit progress could not be read, so the habit numbers above
              may be incomplete. Reload to try again.
            </p>
          )}

          <section className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">Habits</h2>
            {habitsLoading ? (
              <SkeletonList count={3} label="Reading habit progress" />
            ) : dueHabits.length === 0 ? (
              <p className="text-sm text-subtle">
                No habits were running in this week.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {dueHabits.map((review) => (
                  <HabitReviewRow key={review.habitId} review={review} />
                ))}
              </ul>
            )}
          </section>

          <ReviewTaskSection
            title="Completed"
            tasks={recap.completed}
            emptyLine="No tasks were completed in this week."
            done
          />
          <ReviewTaskSection
            title="Still open"
            tasks={recap.open}
            emptyLine="Everything planned for this week is done."
          />
          {recap.carried.length > 0 && (
            <ReviewTaskSection
              title="Carried over from earlier"
              tasks={recap.carried}
              emptyLine=""
            />
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dd className="text-lg font-semibold tracking-tight text-foreground">
        {value}
      </dd>
      <dt className="text-xs text-subtle">
        {label}
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </dt>
    </div>
  );
}

/** The streak verdict, in the one place it is spelled out. */
const STREAK_BADGE: Record<
  HabitWeekReview["streak"],
  { label: string; className: string } | null
> = {
  held: { label: "Streak held", className: "bg-success-soft text-success-muted" },
  broken: {
    label: "Streak broken",
    className: "bg-warning-soft text-warning-muted",
  },
  open: null,
};

/** One habit's week. Read-only, like everything else on this route. */
function HabitReviewRow({ review }: { review: HabitWeekReview }) {
  const badge = STREAK_BADGE[review.streak];

  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-background px-3 py-2">
      {/* `basis-32` rather than `flex-1`: with a zero basis the name is the
          only thing that shrinks, and a 375px row cut "Read two chapters
          before bed" down to "Read two cha…". With a real basis the trailing
          badges wrap to a second line instead. */}
      <span className="min-w-0 grow basis-32 truncate text-sm text-foreground">
        {review.name}
      </span>
      {/* No `PeriodBadge` here: it spells `Period.DAY` as "Today", which is
          exactly the wrong word in a recap of a week that has passed. The
          progress label carries the cadence instead — "3/7 days",
          "1/1 mark this week". */}
      <span className="text-xs text-muted">
        {review.committed === 0
          ? `${review.skipped} skipped, nothing due`
          : habitWeekProgressLabel(review)}
      </span>
      {review.skipped > 0 && (
        <Badge className="bg-fill-strong text-subtle">
          {review.skipped} skipped
        </Badge>
      )}
      {review.pending > 0 && review.streak === "open" && (
        <Badge className="bg-fill-strong text-subtle">Still running</Badge>
      )}
      {badge && <Badge className={badge.className}>{badge.label}</Badge>}
    </li>
  );
}

/** Read-only task rows. Not `TaskItem`: nothing on this route is operable. */
function ReviewTaskSection({
  title,
  tasks,
  emptyLine,
  done = false,
}: {
  title: string;
  tasks: Task[];
  emptyLine: string;
  done?: boolean;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-subtle">{emptyLine}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              {done ? (
                <CircleCheck
                  width={16}
                  height={16}
                  aria-hidden
                  className="shrink-0 text-success-muted"
                />
              ) : (
                <Circle
                  width={16}
                  height={16}
                  aria-hidden
                  className="shrink-0 text-subtle"
                />
              )}
              <span
                className={[
                  "flex-1 truncate text-sm text-foreground",
                  done ? "line-through" : "",
                ].join(" ")}
              >
                {task.title}
              </span>
              <PeriodBadge period={task.scope ?? Period.WEEK} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
