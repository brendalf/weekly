"use client";

import { useMemo } from "react";
import {
  Period,
  addDays,
  filterHabitsByDay,
  getISOWeek,
  getTaskVisibility,
  getWeekDays,
  isHabitSkipped,
  type Task,
} from "@weekly/domain";
import { CircleCheck, Circle } from "@gravity-ui/icons";
import { EmptyState } from "../../components/ui";
import { PeriodBadge } from "../../components/general/PeriodBadge";
import { useAppData } from "../../components/shell/AppDataProvider";
import { WeekPicker } from "../../components/calendar/WeekPicker";
import { useCalendarStore } from "../../stores/calendar";

/**
 * `/app/review` — the weekly close, read-only (DIRECTION §3).
 *
 * The week under review is whichever week the shell is on: `calendarStore` is
 * global, so picking Thursday on `/app/week` and coming here reviews that week.
 *
 * **TODO (WS8):** the numbers that need per-habit progress — completion rate,
 * streaks held vs. broken — are not here yet, because they need the
 * `habitProgress` subscriptions `HabitItem` opens per row. WS8 should read them
 * through `packages/domain`'s `habit.ts` rather than recomputing in the
 * component, and must stay read-only: carry-over actions are out of scope
 * (DIRECTION §8).
 */
export default function ReviewPage() {
  const { habits, tasks, notes } = useAppData();
  const weekStart = useCalendarStore((s) => s.weekStart);

  const { year, week } = getISOWeek(weekStart);

  const recap = useMemo(() => {
    const days = getWeekDays(weekStart);
    const weekEnd = addDays(weekStart, 7);

    // A habit counts as committed this week if it was active (and not skipped)
    // on at least one of the week's days.
    const committedHabitIds = new Set<string>();
    const skippedHabitIds = new Set<string>();
    for (const day of days) {
      for (const habit of filterHabitsByDay(habits, day)) {
        if (isHabitSkipped(habit, day)) skippedHabitIds.add(habit.id);
        else committedHabitIds.add(habit.id);
      }
    }

    // A task is in this week if any of its days put it in play.
    const inWeek: Task[] = tasks.filter((task) =>
      days.some((day) => getTaskVisibility(task, day) === "current"),
    );
    const completed = inWeek.filter((t) => t.completed);
    const open = inWeek.filter((t) => !t.completed);

    // Tasks from an earlier period that are still open at the end of the week.
    const carried = tasks.filter(
      (task) =>
        !task.completed &&
        getTaskVisibility(task, addDays(weekStart, 6)) === "past_open",
    );

    const startISO = weekStart.toISOString();
    const endISO = weekEnd.toISOString();
    const notesAdded = notes.filter(
      (n) => n.createdAt >= startISO && n.createdAt < endISO,
    );

    return {
      committedHabits: committedHabitIds.size,
      skippedHabits: skippedHabitIds.size,
      completed,
      open,
      carried,
      notesAdded: notesAdded.length,
    };
  }, [habits, tasks, notes, weekStart]);

  const nothingHappened =
    recap.committedHabits === 0 &&
    recap.completed.length === 0 &&
    recap.open.length === 0 &&
    recap.carried.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <WeekPicker />
        <p className="text-sm text-muted">
          Week {week} of {year}
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
            <Stat label="Habits committed" value={recap.committedHabits} />
            {recap.skippedHabits > 0 && (
              <Stat label="Habits skipped" value={recap.skippedHabits} />
            )}
            <Stat label="Tasks completed" value={recap.completed.length} />
            <Stat label="Tasks still open" value={recap.open.length} />
            {recap.notesAdded > 0 && (
              <Stat label="Notes added" value={recap.notesAdded} />
            )}
          </dl>

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dd className="text-lg font-semibold tracking-tight text-foreground">
        {value}
      </dd>
      <dt className="text-xs text-subtle">{label}</dt>
    </div>
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
