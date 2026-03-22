"use client";

import { useState, useCallback, useMemo } from "react";
import { Habit, Task, Project, Period } from "@weekly/domain";
import { ChevronsUp } from "@gravity-ui/icons";
import { HabitList } from "./habits/HabitList";
import { TaskList } from "./tasks/TaskList";

interface PeriodPanelProps {
  period: Period;
  scope: Period;
  habits: Habit[];
  tasks: Task[];
  projects?: Project[];
  innerLayout?: "sequential" | "side-by-side";
  showHabitPeriodLabel?: boolean;
  showTaskScopeLabel?: boolean;
  onToggleTaskCompleted: (taskId: string) => void;
  onHabitsCompleted?: (completions: Record<string, boolean>) => void;
}

function SectionHeader({
  label,
  collapsed,
  done,
  total,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  done: number;
  total: number;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none pb-1"
      onClick={onToggle}
    >
      {collapsed && (
        <ChevronsUp width={12} height={12} className="text-foreground/40 shrink-0" />
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">{label}</p>
      {collapsed && total > 0 && (
        <p className="text-xs text-foreground/30">{done}/{total}</p>
      )}
    </div>
  );
}

export function PeriodPanel({
  period,
  scope,
  habits,
  tasks,
  projects,
  innerLayout = "sequential",
  showHabitPeriodLabel = false,
  showTaskScopeLabel = true,
  onToggleTaskCompleted,
  onHabitsCompleted,
}: PeriodPanelProps) {
  const [collapsedHabits, setCollapsedHabits] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState(false);
  const [habitCompletedCount, setHabitCompletedCount] = useState(0);

  const habitTotal = useMemo(
    () => habits.filter((h) => h.period === period).length,
    [habits, period],
  );

  const taskTotal = useMemo(
    () => tasks.filter((t) => (t.scope ?? Period.WEEK) === scope).length,
    [tasks, scope],
  );

  const taskDone = useMemo(
    () => tasks.filter((t) => (t.scope ?? Period.WEEK) === scope && t.completed).length,
    [tasks, scope],
  );

  const wrappedOnHabitsCompleted = useCallback(
    (completions: Record<string, boolean>) => {
      setHabitCompletedCount(Object.values(completions).filter(Boolean).length);
      onHabitsCompleted?.(completions);
    },
    [onHabitsCompleted],
  );

  const habitSection = (
    <div>
      <SectionHeader
        label="Habits"
        collapsed={collapsedHabits}
        done={habitCompletedCount}
        total={habitTotal}
        onToggle={() => setCollapsedHabits((v) => !v)}
      />
      <div className={`collapsible${collapsedHabits ? " collapsed" : ""}`}>
        <div>
          <HabitList
            hideHeader
            habits={habits}
            projects={projects}
            periodFilter={period}
            showPeriodLabel={showHabitPeriodLabel}
            onHabitsCompleted={wrappedOnHabitsCompleted}
          />
        </div>
      </div>
    </div>
  );

  const taskSection = (
    <div>
      <SectionHeader
        label="Tasks"
        collapsed={collapsedTasks}
        done={taskDone}
        total={taskTotal}
        onToggle={() => setCollapsedTasks((v) => !v)}
      />
      <div className={`collapsible${collapsedTasks ? " collapsed" : ""}`}>
        <div>
          <TaskList
            hideHeader
            tasks={tasks}
            onToggleCompleted={onToggleTaskCompleted}
            projects={projects}
            scopeFilter={scope}
            showScopeLabel={showTaskScopeLabel}
          />
        </div>
      </div>
    </div>
  );

  if (innerLayout === "side-by-side") {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>{habitSection}</section>
        <section>{taskSection}</section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {habitSection}
      {taskSection}
    </div>
  );
}
