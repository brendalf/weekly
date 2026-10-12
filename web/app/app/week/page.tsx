"use client";

import { formatDayLabel } from "@weekly/domain";
import { WeekPicker } from "../../components/calendar/WeekPicker";
import { WeekdaysCarousel } from "../../components/calendar/WeekdaysCarousel";
import { HabitsTasksView } from "../../components/HabitsTasksView";
import { useAppData } from "../../components/shell/AppDataProvider";
import { useCalendarStore } from "../../stores/calendar";

/**
 * `/app/week` — the week planner (DIRECTION §3).
 *
 * WS3 moved the old single-page content here mostly intact and took away the
 * four layout permutations. WS4 owns the redesign: collapse `WeekPicker` +
 * `WeekdaysCarousel` + the period tabs (≈200px of chrome before any content)
 * into one header, make the week rather than the day the default scope, and add
 * the starter-habit empty state.
 */
export default function WeekPage() {
  const {
    habits,
    tasks,
    pickerWorkspaces,
    showCompletedTasks,
    showSkippedHabits,
    setShowCompletedTasks,
    setShowSkippedHabits,
    toggleTaskCompleted,
  } = useAppData();

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const dayLabel = formatDayLabel(
    selectedDayISO ? new Date(selectedDayISO) : new Date(),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{dayLabel}</p>
        <WeekPicker />
        <WeekdaysCarousel />
      </div>

      <HabitsTasksView
        habits={habits}
        tasks={tasks}
        workspaces={pickerWorkspaces}
        showCompletedTasks={showCompletedTasks}
        showSkippedHabits={showSkippedHabits}
        onToggleTaskCompleted={toggleTaskCompleted}
        onShowCompletedTasksChange={setShowCompletedTasks}
        onShowSkippedHabitsChange={setShowSkippedHabits}
      />
    </div>
  );
}
