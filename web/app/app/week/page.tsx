"use client";

import { useCallback, useMemo, useState } from "react";
import {
  dayKeyOf,
  DEFAULT_WEEK_SCOPE,
  scopeProgress,
  type HabitTimeOfDay,
  type Period,
  type StarterHabit,
} from "@weekly/domain";
import { toast } from "sonner";
import { HabitsTasksView } from "../../components/HabitsTasksView";
import { StarterHabits } from "../../components/week/StarterHabits";
import { WeekHeader } from "../../components/week/WeekHeader";
import { WeekToolbar } from "../../components/week/WeekToolbar";
import { useAppData } from "../../components/shell/AppDataProvider";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useActivityLog } from "../../hooks/useActivityLog";
import { useHabitTaskSearch } from "../../hooks/useHabitTaskSearch";
import { useCalendarStore } from "../../stores/calendar";
import { useWorkspaceSelection } from "../../stores/workspace";

/**
 * `/app/week` — the week planner, and the product's front door (DIRECTION §3).
 *
 * The week is the unit of commitment, so the route is built in that order:
 * **which week** (`WeekHeader`), **which slice of it** (`WeekToolbar`), then
 * the plan itself. It opens on the week scope — the old page defaulted to the
 * day, which inverted the premise the product is named after.
 *
 * The route owns three things the view components do not: the filtered lists,
 * the habit-completion state the rows report upward, and the two write
 * handlers. Everything it reads comes from the shell's `useAppData()`; nothing
 * here subscribes, and nothing here touches Firestore directly.
 */
export default function WeekPage() {
  const {
    habits: allHabits,
    tasks: allTasks,
    pickerWorkspaces,
    showCompletedTasks,
    showSkippedHabits,
    setShowCompletedTasks,
    setShowSkippedHabits,
    toggleTaskCompleted,
  } = useAppData();

  const [scope, setScope] = useState<Period>(DEFAULT_WEEK_SCOPE);
  const { activeRepos, getWorkspaceRepos } = useRepositoryContext();
  const logActivity = useActivityLog();
  const selection = useWorkspaceSelection();

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDay = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : new Date()),
    [selectedDayISO],
  );
  const dayKey = dayKeyOf(selectedDay);

  // With no query these are the full lists.
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    isActive: isFiltered,
    isSearching,
    habits,
    tasks,
  } = useHabitTaskSearch(allHabits, allTasks);

  /* ------------------------------------------------------------ progress -- */

  // Completion lives in each habit's own summary subscription, so the rows
  // report it back up. Stamped with the day they describe: a habit finished
  // yesterday must not count towards today (the old view merged blindly and
  // carried stale completions across a day change).
  const [completed, setCompleted] = useState<{
    day: string;
    byId: Record<string, boolean>;
  }>({ day: "", byId: {} });

  const handleHabitsCompleted = useCallback(
    (completions: Record<string, boolean>) => {
      setCompleted((prev) => {
        if (prev.day !== dayKey) return { day: dayKey, byId: { ...completions } };
        const unchanged = Object.entries(completions).every(
          ([id, done]) => prev.byId[id] === done,
        );
        if (unchanged) return prev;
        return { day: dayKey, byId: { ...prev.byId, ...completions } };
      });
    },
    [dayKey],
  );

  const completedHabitIds = useMemo(() => {
    if (completed.day !== dayKey) return new Set<string>();
    return new Set(
      Object.entries(completed.byId)
        .filter(([, done]) => done)
        .map(([id]) => id),
    );
  }, [completed, dayKey]);

  const progress = useMemo(
    () => scopeProgress(habits, tasks, selectedDay, completedHabitIds),
    [habits, tasks, selectedDay, completedHabitIds],
  );

  /* ------------------------------------------------------------- writing -- */

  const createHabit = useCallback(
    async (
      name: string,
      times: number,
      period: Period,
      workspaceId?: string,
      activeDays?: number[],
      timeOfDay?: HabitTimeOfDay,
    ) => {
      // The modal only offers a picker when several workspaces are in view;
      // otherwise the one in view is the target. A starter habit never picks.
      const targetId =
        workspaceId ?? selection.singleId ?? selection.workspaceIds[0];
      const target = targetId ? getWorkspaceRepos(targetId) : activeRepos;
      if (!target) throw new Error("No workspace to add to");

      const habitId = await target.habit.addHabit(
        name,
        times,
        period,
        selectedDay,
        activeDays,
        timeOfDay,
      );
      if (!habitId) throw new Error("Habit was not created");
      logActivity(targetId, {
        type: "habit_added",
        itemId: habitId,
        itemName: name,
      });
    },
    [
      activeRepos,
      getWorkspaceRepos,
      logActivity,
      selectedDay,
      selection.singleId,
      selection.workspaceIds,
    ],
  );

  const handleAddHabit = useCallback(
    (
      name: string,
      times: number,
      period: Period,
      workspaceId?: string,
      activeDays?: number[],
      timeOfDay?: HabitTimeOfDay,
    ) => {
      void createHabit(name, times, period, workspaceId, activeDays, timeOfDay).catch(
        () => toast.error("Could not add that habit. Please try again."),
      );
    },
    [createHabit],
  );

  const handleCreateStarter = useCallback(
    (starter: StarterHabit) =>
      createHabit(
        starter.name,
        starter.times,
        starter.period,
        undefined,
        undefined,
        starter.timeOfDay,
      ),
    [createHabit],
  );

  const handleAddTask = useCallback(
    (title: string, workspaceId?: string, taskScope?: Period) => {
      const targetId =
        workspaceId ?? selection.singleId ?? selection.workspaceIds[0];
      const target = targetId ? getWorkspaceRepos(targetId) : activeRepos;
      if (!target) return;

      void target.task
        .addTask(title, taskScope, selectedDay)
        .then((taskId) => {
          if (!taskId) return;
          logActivity(targetId, {
            type: "task_added",
            itemId: taskId,
            itemName: title,
          });
        })
        .catch(() => toast.error("Could not add that task. Please try again."));
    },
    [
      activeRepos,
      getWorkspaceRepos,
      logActivity,
      selectedDay,
      selection.singleId,
      selection.workspaceIds,
    ],
  );

  /* ------------------------------------------------------------ rendering -- */

  const canAdd = Boolean(activeRepos || pickerWorkspaces);
  // "Nothing here at all" — not "nothing in this scope", and not "nothing
  // matches the filter". Both of those are section-level states.
  const isFirstWeek = allHabits.length === 0 && allTasks.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <WeekHeader />

      {isFirstWeek ? (
        <StarterHabits
          workspaces={pickerWorkspaces}
          onCreateStarter={handleCreateStarter}
          onAddHabit={handleAddHabit}
          onAddTask={handleAddTask}
        />
      ) : (
        <>
          <WeekToolbar
            scope={scope}
            progress={progress}
            onScopeChange={setScope}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            isSearching={isSearching}
            workspaces={pickerWorkspaces}
            canAdd={canAdd}
            onAddHabit={handleAddHabit}
            onAddTask={handleAddTask}
            showCompletedTasks={showCompletedTasks}
            showSkippedHabits={showSkippedHabits}
            onShowCompletedTasksChange={setShowCompletedTasks}
            onShowSkippedHabitsChange={setShowSkippedHabits}
          />

          <HabitsTasksView
            habits={habits}
            tasks={tasks}
            scope={scope}
            progress={progress}
            workspaces={pickerWorkspaces}
            showCompletedTasks={showCompletedTasks}
            showSkippedHabits={showSkippedHabits}
            isFiltered={isFiltered}
            onToggleTaskCompleted={toggleTaskCompleted}
            onHabitsCompleted={handleHabitsCompleted}
          />
        </>
      )}
    </div>
  );
}
