"use client";

import { useMemo } from "react";
import {
  Habit,
  Task,
  Period,
  filterHabitsByDay,
  isHabitSkipped,
  getTaskVisibility,
} from "@weekly/domain";

interface ProgressSummaryProps {
  habits: Habit[];
  tasks: Task[];
  selectedDay: Date;
  habitCompletions: Record<string, boolean>;
}

interface Segment {
  label: string;
  short: string;
  done: number;
  total: number;
}

export function ProgressSummary({
  habits,
  tasks,
  selectedDay,
  habitCompletions,
}: ProgressSummaryProps) {
  const segments = useMemo<Segment[]>(() => {
    const visibleHabits = filterHabitsByDay(habits, selectedDay);

    // Exclude skipped habits from progress counts
    const dayHabits = visibleHabits.filter(
      (h) => h.period === Period.DAY && !isHabitSkipped(h, selectedDay),
    );
    const weekHabits = visibleHabits.filter(
      (h) => h.period === Period.WEEK && !isHabitSkipped(h, selectedDay),
    );
    const monthHabits = visibleHabits.filter(
      (h) => h.period === Period.MONTH && !isHabitSkipped(h, selectedDay),
    );

    const classifiedTasks = tasks.map((task) => ({
      task,
      visibility: getTaskVisibility(task, selectedDay),
    }));

    const dayTasks = classifiedTasks.filter(
      ({ task, visibility }) => (task.scope ?? Period.WEEK) === Period.DAY && visibility !== "hidden",
    );
    const weekTasks = classifiedTasks.filter(
      ({ task, visibility }) => (task.scope ?? Period.WEEK) === Period.WEEK && visibility !== "hidden",
    );
    const monthTasks = classifiedTasks.filter(
      ({ task, visibility }) => (task.scope ?? Period.WEEK) === Period.MONTH && visibility !== "hidden",
    );

    return [
      {
        label: "Today",
        short: "Today",
        done:
          dayHabits.filter((h) => habitCompletions[h.id]).length +
          dayTasks.filter(({ task }) => task.completed).length,
        total: dayHabits.length + dayTasks.length,
      },
      {
        label: "This week",
        short: "Week",
        done:
          weekHabits.filter((h) => habitCompletions[h.id]).length +
          weekTasks.filter(({ task }) => task.completed).length,
        total: weekHabits.length + weekTasks.length,
      },
      {
        label: "This month",
        short: "Month",
        done:
          monthHabits.filter((h) => habitCompletions[h.id]).length +
          monthTasks.filter(({ task }) => task.completed).length,
        total: monthHabits.length + monthTasks.length,
      },
    ];
  }, [habits, tasks, selectedDay, habitCompletions]);

  const active = segments.filter((s) => s.total > 0);
  if (active.length === 0) return null;

  return (
    <div className="flex items-stretch gap-0 rounded-xl border border-border bg-surface overflow-hidden">
      {active.map((seg, i) => {
        const pct = seg.total > 0 ? (seg.done / seg.total) * 100 : 0;
        const allDone = seg.done === seg.total;
        return (
          <div
            key={seg.label}
            className={[
              "flex flex-1 flex-col gap-1.5 px-4 py-2.5",
              i < active.length - 1 ? "border-r border-border" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-subtle">{seg.short}</span>
              <span className={["text-xs tabular-nums font-semibold", allDone ? "text-brand-muted" : "text-muted"].join(" ")}>
                {seg.done}/{seg.total}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-fill-strong overflow-hidden">
              <div
                className={["h-full rounded-full transition-all duration-250", allDone ? "bg-brand" : "bg-brand/60"].join(" ")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
