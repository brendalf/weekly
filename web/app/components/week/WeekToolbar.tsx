"use client";

import { useMemo, useState } from "react";
import type {
  HabitTimeOfDay,
  Period,
  ScopeProgress,
  Workspace,
} from "@weekly/domain";
import { Eye, Plus } from "@gravity-ui/icons";
import { HabitAddModal } from "../habits/HabitAddModal";
import { TaskAddModal } from "../tasks/TaskAddModal";
import { ActionMenu } from "../ui";
import { ScopeTabs } from "./ScopeTabs";

export interface AddHabit {
  (
    name: string,
    times: number,
    period: Period,
    workspaceId?: string,
    activeDays?: number[],
    timeOfDay?: HabitTimeOfDay,
  ): void;
}

export interface AddTask {
  (title: string, workspaceId?: string, scope?: Period): void;
}

interface WeekToolbarProps {
  scope: Period;
  progress: ScopeProgress[];
  onScopeChange: (period: Period) => void;

  /** Shown in the add modals when more than one workspace is in view. */
  workspaces?: Workspace[];
  /** False before a workspace is writable; hides the add control. */
  canAdd: boolean;
  onAddHabit: AddHabit;
  onAddTask: AddTask;

  showCompletedTasks: boolean;
  showSkippedHabits: boolean;
  onShowCompletedTasksChange: (show: boolean) => void;
  onShowSkippedHabitsChange: (show: boolean) => void;
}

/**
 * The row between the week and its contents: which slice of the plan, and
 * what to do about it.
 *
 * It wraps rather than overflows — on a 375px phone the scope segments keep
 * the first line and the two menus drop to a second one, which is the fix for
 * the old toolbar's single non-wrapping flex (PLAN WS13).
 *
 * The filter is not here: there is one, in the shell header, scoped to the
 * active route (PLAN WS11).
 */
export function WeekToolbar({
  scope,
  progress,
  onScopeChange,
  workspaces,
  canAdd,
  onAddHabit,
  onAddTask,
  showCompletedTasks,
  showSkippedHabits,
  onShowCompletedTasksChange,
  onShowSkippedHabitsChange,
}: WeekToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <ScopeTabs
        scope={scope}
        progress={progress}
        onScopeChange={onScopeChange}
      />

      {/* Deliberately not `flex-1`: a flex-basis of 0 always "fits", so the
          row would never wrap and these would overflow a 375px screen
          instead. At its natural width it wraps to a second line. */}
      <div className="flex shrink-0 items-center gap-1">
        <DisplayOptionsMenu
          showCompletedTasks={showCompletedTasks}
          showSkippedHabits={showSkippedHabits}
          onShowCompletedTasksChange={onShowCompletedTasksChange}
          onShowSkippedHabitsChange={onShowSkippedHabitsChange}
        />
        {canAdd && (
          <AddMenu
            workspaces={workspaces}
            onAddHabit={onAddHabit}
            onAddTask={onAddTask}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Add a habit or a task to the week.
 *
 * The planner's primary action, so it carries a word and the brand fill
 * rather than being a bare `+` glyph among the other icons (DIRECTION §6.7).
 */
export function AddMenu({
  workspaces,
  onAddHabit,
  onAddTask,
}: {
  workspaces?: Workspace[];
  onAddHabit: AddHabit;
  onAddTask: AddTask;
}) {
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  return (
    <>
      <ActionMenu
        label="Add to this week"
        trigger={
          // The colors live on an inner element so they cannot lose a
          // specificity race with the trigger's own `text-subtle`.
          <span className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover">
            <Plus width={16} height={16} aria-hidden />
            Add
          </span>
        }
        items={[
          {
            key: "habit",
            label: "Habit",
            description: "Recurs every day, week, or month",
            onAction: () => setHabitModalOpen(true),
          },
          {
            key: "task",
            label: "Task",
            description: "Happens once",
            onAction: () => setTaskModalOpen(true),
          },
        ]}
      />

      <HabitAddModal
        isOpen={habitModalOpen}
        onOpenChange={setHabitModalOpen}
        onSubmit={onAddHabit}
        workspaces={workspaces}
        trigger={<span style={{ display: "none" }} />}
      />
      <TaskAddModal
        isOpen={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSubmit={onAddTask}
        workspaces={workspaces}
        trigger={<span style={{ display: "none" }} />}
      />
    </>
  );
}

/**
 * Display state for the lists: completed tasks and skipped habits.
 *
 * All that survives of `LayoutSettingsButton`, whose 2×2 `layout` ×
 * `innerLayout` matrix is gone (DIRECTION §3, "what dies") — one layout per
 * route. What is left runs on the shared `ActionMenu`, so it closes on `Esc`,
 * traps focus, and repositions on scroll.
 *
 * WS11 promotes these two to visible chips: they are display state, not
 * search, and they do not belong in a gear popover.
 */
function DisplayOptionsMenu({
  showCompletedTasks,
  showSkippedHabits,
  onShowCompletedTasksChange,
  onShowSkippedHabitsChange,
}: {
  showCompletedTasks: boolean;
  showSkippedHabits: boolean;
  onShowCompletedTasksChange: (show: boolean) => void;
  onShowSkippedHabitsChange: (show: boolean) => void;
}) {
  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (showCompletedTasks) keys.add("completed");
    if (showSkippedHabits) keys.add("skipped");
    return keys;
  }, [showCompletedTasks, showSkippedHabits]);

  return (
    <ActionMenu
      label="Display options"
      trigger={<Eye width={16} height={16} />}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        const next =
          keys === "all" ? new Set<string>(["completed", "skipped"]) : keys;
        onShowCompletedTasksChange(next.has("completed"));
        onShowSkippedHabitsChange(next.has("skipped"));
      }}
      items={[
        { key: "completed", label: "Show completed" },
        { key: "skipped", label: "Show skipped habits" },
      ]}
    />
  );
}
