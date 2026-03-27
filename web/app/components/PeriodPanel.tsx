"use client";

import { useState, useCallback, useMemo } from "react";
import { Workspace, Task, Habit, Period } from "@weekly/domain";
import { HabitList } from "./habits/HabitList";
import { TaskList } from "./tasks/TaskList";
import { NoteList } from "./notes/NoteList";
import { SectionHeader } from "./general/SectionHeader";

interface PeriodPanelProps {
  period: Period;
  habits: Habit[];
  tasks: Task[];
  workspaces?: Workspace[];
  innerLayout?: "sequential" | "side-by-side";
  showHabitPeriodLabel?: boolean;
  showTaskScopeLabel?: boolean;
  onToggleTaskCompleted: (taskId: string) => void;
  onHabitsCompleted?: (completions: Record<string, boolean>) => void;
}

export function PeriodPanel({
  period,
  habits,
  tasks,
  workspaces,
  innerLayout = "sequential",
  showHabitPeriodLabel = false,
  showTaskScopeLabel = true,
  onToggleTaskCompleted,
  onHabitsCompleted,
}: PeriodPanelProps) {
  const [collapsedNotes, setCollapsedNotes] = useState(false);
  const [collapsedHabits, setCollapsedHabits] = useState(false);
  const [collapsedTasks, setCollapsedTasks] = useState(false);
  const [habitCompletedCount, setHabitCompletedCount] = useState(0);

  const habitTotal = useMemo(
    () => habits.filter((h) => h.period === period).length,
    [habits, period],
  );

  const taskTotal = useMemo(
    () => tasks.filter((t) => (t.scope ?? Period.WEEK) === period).length,
    [tasks, period],
  );

  const taskDone = useMemo(
    () => tasks.filter((t) => (t.scope ?? Period.WEEK) === period && t.completed).length,
    [tasks, period],
  );

  const wrappedOnHabitsCompleted = useCallback(
    (completions: Record<string, boolean>) => {
      setHabitCompletedCount(Object.values(completions).filter(Boolean).length);
      onHabitsCompleted?.(completions);
    },
    [onHabitsCompleted],
  );

  const notesSection = period === Period.WEEK && (
    <div>
      <SectionHeader
        label="Notes"
        collapsed={collapsedNotes}
        done={0}
        total={0}
        onToggle={() => setCollapsedNotes((v) => !v)}
      />
      <div className={`collapsible${collapsedNotes ? " collapsed" : ""}`}>
        <div>
          <NoteList />
        </div>
      </div>
    </div>
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
            workspaces={workspaces}
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
            workspaces={workspaces}
            scopeFilter={period}
            showScopeLabel={showTaskScopeLabel}
          />
        </div>
      </div>
    </div>
  );

  if (innerLayout === "side-by-side") {
    return (
      <div className="flex flex-col gap-3">
        {notesSection}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section>{habitSection}</section>
          <section>{taskSection}</section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {notesSection}
      {habitSection}
      {taskSection}
    </div>
  );
}
