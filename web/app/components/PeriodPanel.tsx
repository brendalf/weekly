"use client";

import type { Habit, Period, ScopeCount, Task, Workspace } from "@weekly/domain";
import { HabitList } from "./habits/HabitList";
import { TaskList } from "./tasks/TaskList";
import { Collapsible } from "./ui";

interface PeriodPanelProps {
  /** Cadence this panel shows: habits with this period, tasks with this scope. */
  period: Period;
  habits: Habit[];
  tasks: Task[];
  workspaces?: Workspace[];
  /** Done/total for the habits section header. See `scopeProgress`. */
  habitCount: ScopeCount;
  /** Done/total for the tasks section header. */
  taskCount: ScopeCount;
  showHabitPeriodLabel?: boolean;
  showTaskScopeLabel?: boolean;
  showCompletedTasks?: boolean;
  showSkippedHabits?: boolean;
  habitsEmptyMessage?: string;
  tasksEmptyMessage?: string;
  /**
   * Namespace for the two sections' persisted collapse state. Shared across
   * cadences on purpose: "I collapsed habits" is a statement about habits, not
   * about the week tab I happened to be on.
   */
  storageKeyPrefix?: string;
  onToggleTaskCompleted: (taskId: string) => Promise<void>;
  onHabitsCompleted?: (completions: Record<string, boolean>) => void;
}

/**
 * One cadence of the plan: its habits, then its tasks.
 *
 * **The** implementation of those two sections. `HabitsTasksView` used to hold
 * a second copy of this markup for the `period-sequential` layout, so the two
 * drifted — different counts, different collapse behavior, same screen
 * (DIRECTION §3, "what dies"). There is one copy now, and it is this one.
 *
 * Habits lead because they are the recurring commitment the week is built on;
 * tasks are the one-offs hung off it. Single column at every width: the old
 * `side-by-side` option only split at `lg:`, so it silently did nothing on a
 * tablet, and a planner is read top to bottom rather than compared across
 * columns.
 *
 * The counts arrive as props rather than being recomputed here, so the section
 * headers and the scope rings can never disagree.
 */
export function PeriodPanel({
  period,
  habits,
  tasks,
  workspaces,
  habitCount,
  taskCount,
  showHabitPeriodLabel = false,
  showTaskScopeLabel = true,
  showCompletedTasks = true,
  showSkippedHabits = true,
  habitsEmptyMessage,
  tasksEmptyMessage,
  storageKeyPrefix = "week",
  onToggleTaskCompleted,
  onHabitsCompleted,
}: PeriodPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <Collapsible
        label="Habits"
        count={habitCount.total > 0 ? `${habitCount.done}/${habitCount.total}` : undefined}
        storageKey={`${storageKeyPrefix}:habits`}
      >
        <HabitList
          hideHeader
          habits={habits}
          workspaces={workspaces}
          periodFilter={period}
          showPeriodLabel={showHabitPeriodLabel}
          showSkipped={showSkippedHabits}
          showCompleted={showCompletedTasks}
          emptyMessage={habitsEmptyMessage}
          onHabitsCompleted={onHabitsCompleted}
        />
      </Collapsible>

      <Collapsible
        label="Tasks"
        count={taskCount.total > 0 ? `${taskCount.done}/${taskCount.total}` : undefined}
        storageKey={`${storageKeyPrefix}:tasks`}
      >
        <TaskList
          hideHeader
          tasks={tasks}
          onToggleCompleted={onToggleTaskCompleted}
          workspaces={workspaces}
          scopeFilter={period}
          showScopeLabel={showTaskScopeLabel}
          showCompleted={showCompletedTasks}
          emptyMessage={tasksEmptyMessage}
        />
      </Collapsible>
    </div>
  );
}
