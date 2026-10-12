"use client";

import { Period, WEEK_SCOPES } from "@weekly/domain";
import type { Habit, ScopeProgress, Task, Workspace } from "@weekly/domain";
import { PeriodPanel } from "./PeriodPanel";

interface HabitsTasksViewProps {
  /** Habits already narrowed by the toolbar filter. */
  habits: Habit[];
  /** Tasks already narrowed by the toolbar filter. */
  tasks: Task[];
  /** Cadence on screen. */
  scope: Period;
  /** One entry per scope, in `WEEK_SCOPES` order. */
  progress: ScopeProgress[];
  workspaces?: Workspace[];
  showCompletedTasks: boolean;
  showSkippedHabits: boolean;
  /** True while a filter is applied, so "empty" means "no match". */
  isFiltered: boolean;
  onToggleTaskCompleted: (taskId: string) => Promise<void>;
  onHabitsCompleted: (completions: Record<string, boolean>) => void;
}

/** What an empty section means, per cadence. Never "No habits yet." */
const EMPTY_COPY: Record<Period, { habits: string; tasks: string }> = {
  [Period.WEEK]: {
    habits: "No weekly habits. Add one to commit to it every week.",
    tasks: "Nothing to do this week yet.",
  },
  [Period.DAY]: {
    habits: "No daily habits for this day.",
    tasks: "Nothing to do on this day yet.",
  },
  [Period.MONTH]: {
    habits: "No monthly habits. Add one for something you do once a month.",
    tasks: "Nothing to do this month yet.",
  },
};

/**
 * The week's plan, for the cadence in view.
 *
 * This file used to be the whole product: 616 lines holding a layout-preference
 * menu, an add menu, the progress math, the search wiring, three copies of the
 * activity-logging boilerplate, a note list, and a second copy of the
 * habits/tasks sections that `PeriodPanel` already rendered. Routing (WS3) took
 * the subscriptions, `/app/notes` took the notes, and the rest moved out to
 * where it belongs: the page owns the data and the handlers, `WeekHeader` and
 * `WeekToolbar` own the chrome, `PeriodPanel` owns the sections, and
 * `@weekly/domain`'s `scopeProgress` owns the arithmetic.
 *
 * What is left is the one decision this component exists to make: which
 * cadence is showing. All three stay mounted — each one's habit rows carry the
 * completion state that feeds every scope's ring, so switching must not
 * unmount them, and a switch costs no re-subscription.
 */
export function HabitsTasksView({
  habits,
  tasks,
  scope,
  progress,
  workspaces,
  showCompletedTasks,
  showSkippedHabits,
  isFiltered,
  onToggleTaskCompleted,
  onHabitsCompleted,
}: HabitsTasksViewProps) {
  return (
    <div>
      {WEEK_SCOPES.map(({ period }) => {
        const counts = progress.find((p) => p.period === period);
        const empty = EMPTY_COPY[period];
        return (
          <div key={period} className={scope === period ? "" : "hidden"}>
            <PeriodPanel
              period={period}
              habits={habits}
              tasks={tasks}
              workspaces={workspaces}
              habitCount={counts?.habits ?? { done: 0, total: 0 }}
              taskCount={counts?.tasks ?? { done: 0, total: 0 }}
              showHabitPeriodLabel={false}
              showTaskScopeLabel={false}
              showCompletedTasks={showCompletedTasks}
              showSkippedHabits={showSkippedHabits}
              habitsEmptyMessage={
                isFiltered ? "No habits match your filter." : empty.habits
              }
              tasksEmptyMessage={
                isFiltered ? "No tasks match your filter." : empty.tasks
              }
              onToggleTaskCompleted={onToggleTaskCompleted}
              onHabitsCompleted={onHabitsCompleted}
            />
          </div>
        );
      })}
    </div>
  );
}
