"use client";

import { Habit, Task, Project, HabitPeriod, TaskScope } from "@weekly/domain";
import { HabitList } from "./habits/HabitList";
import { TaskList } from "./tasks/TaskList";

interface PeriodPanelProps {
  period: HabitPeriod;
  scope: TaskScope;
  habits: Habit[];
  tasks: Task[];
  projects?: Project[];
  innerLayout?: "sequential" | "side-by-side";
  onToggleTaskCompleted: (taskId: string) => void;
  onHabitsCompleted?: (completions: Record<string, boolean>) => void;
}

const sectionHeader = (label: string) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40 pb-1">{label}</p>
);

export function PeriodPanel({
  period,
  scope,
  habits,
  tasks,
  projects,
  innerLayout = "sequential",
  onToggleTaskCompleted,
  onHabitsCompleted,
}: PeriodPanelProps) {
  const habitSection = (
    <div>
      {sectionHeader("Habits")}
      <HabitList
        hideHeader
        habits={habits}
        projects={projects}
        periodFilter={period}
        onHabitsCompleted={onHabitsCompleted}
      />
    </div>
  );

  const taskSection = (
    <div>
      {sectionHeader("Tasks")}
      <TaskList
        hideHeader
        tasks={tasks}
        onToggleCompleted={onToggleTaskCompleted}
        projects={projects}
        scopeFilter={scope}
      />
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
