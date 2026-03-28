"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Habit, Period, HabitTimeOfDay, Workspace, filterHabitsByDay, isHabitSkipped, PERIOD_ORDER, TIME_OF_DAY_ORDER } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { HabitItem } from "./HabitItem";
import { HabitAddModal } from "./HabitAddModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useCalendarStore } from "../../stores/calendar";
import { useWorkspaceStore } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";


interface HabitListProps {
  habits: Habit[];
  workspaces?: Workspace[];
  hideHeader?: boolean;
  periodFilter?: Period;
  showPeriodLabel?: boolean;
  onHabitsCompleted?: (completions: Record<string, boolean>) => void;
}

export function HabitList({ habits, workspaces, hideHeader, periodFilter, showPeriodLabel, onHabitsCompleted }: HabitListProps) {
  const { activeRepos, getWorkspaceRepos, getHabitProjectId } =
    useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const storeWorkspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [progressTodayIds, setProgressTodayIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const selectedDay = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : new Date()),
    [selectedDayISO],
  );

  const visibleHabits = useMemo(() => {
    const filtered = filterHabitsByDay(habits, selectedDay);
    if (periodFilter !== undefined) {
      return filtered.filter((h) => h.period === periodFilter);
    }
    return filtered;
  }, [habits, selectedDay, periodFilter]);

  const visibleHabitIds = useMemo(
    () => visibleHabits.map((h) => h.id).join(","),
    [visibleHabits],
  );

  useEffect(() => {
    if (!onHabitsCompleted) return;
    const completions: Record<string, boolean> = {};
    for (const h of visibleHabits) {
      completions[h.id] = completedIds.has(h.id);
    }
    onHabitsCompleted(completions);
  }, [completedIds, onHabitsCompleted, visibleHabitIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompleteChange = useCallback((id: string, complete: boolean, hasProgressToday: boolean) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (complete) next.add(id);
      else next.delete(id);
      return next;
    });
    setProgressTodayIds((prev) => {
      const next = new Set(prev);
      if (hasProgressToday) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleAddHabit = async (
    name: string,
    times: number,
    period: Period,
    workspaceId?: string,
    activeDays?: number[],
    timeOfDay?: HabitTimeOfDay,
  ) => {
    const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
    const date = selectedDayISO ? new Date(selectedDayISO) : new Date();
    const habitId = await repos?.habit.addHabit(name, times, period, date, activeDays, timeOfDay);
    if (!habitId) return;
    const targetWorkspaceId = workspaceId ?? activeWorkspaceId;
    if (!targetWorkspaceId) return;
    const workspace = storeWorkspaces.find((w) => w.id === targetWorkspaceId);
    const user = auth.currentUser;
    if (!user || !workspace || workspace.members.length < 2) return;
    workspaceRepository
      .logActivity(targetWorkspaceId, {
        type: "habit_added",
        actorUid: user.uid,
        actorDisplayName: user.displayName ?? "User",
        itemId: habitId,
        itemName: name,
      })
      .catch(() => {/* non-critical */});
  };

  const sorted = useMemo(() => {
    const skippedIds = new Set(
      visibleHabits.filter((h) => isHabitSkipped(h, selectedDay)).map((h) => h.id),
    );

    const getGroup = (h: Habit): number => {
      if (skippedIds.has(h.id)) return 1;
      if (completedIds.has(h.id) || progressTodayIds.has(h.id)) return 2;
      return 0;
    };

    return [...visibleHabits].sort((a, b) => {
      const groupDiff = getGroup(a) - getGroup(b);
      if (groupDiff !== 0) return groupDiff;
      const periodDiff = PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period];
      if (periodDiff !== 0) return periodDiff;
      const todA = a.timeOfDay ? (TIME_OF_DAY_ORDER[a.timeOfDay] ?? 3) : 3;
      const todB = b.timeOfDay ? (TIME_OF_DAY_ORDER[b.timeOfDay] ?? 3) : 3;
      return todA - todB;
    });
  }, [visibleHabits, completedIds, progressTodayIds, selectedDay]);

  return (
    <div className="flex flex-col gap-2">
      {!hideHeader && (
        <div
          className="flex items-center justify-between rounded-lg border bg-surface py-1 px-4 cursor-pointer select-none"
          onClick={() => setCollapsed((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Habits</p>
            {collapsed && (
              <p className="text-xs text-foreground/50">
                {completedIds.size}/{visibleHabits.length}
              </p>
            )}
          </div>
          {(activeRepos || workspaces) && (
            <div onClick={(e) => e.stopPropagation()}>
              <HabitAddModal
                onSubmit={handleAddHabit}
                workspaces={workspaces}
                trigger={
                  <Button size="sm" isIconOnly aria-label="Add habit" variant="ghost">
                    <Plus />
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

      <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
        <div>
          {visibleHabits.length === 0 && (
            <p className="text-xs text-foreground/60 pt-2">No habits yet.</p>
          )}
          <div className="flex flex-col gap-0.5 pt-1">
            {sorted.map((habit) => {
              const projectName = workspaces
                ? workspaces.find((w) => w.id === getHabitProjectId(habit.id))?.name
                : undefined;
              return (
                <HabitItem
                  key={habit.id}
                  id={habit.id}
                  name={habit.name}
                  target={habit.times}
                  period={habit.period}
                  createdAt={habit.createdAt}
                  activeDays={habit.activeDays}
                  skippedPeriods={habit.skippedPeriods}
                  timeOfDay={habit.timeOfDay}
                  isSkipped={isHabitSkipped(habit, selectedDay)}
                  showPeriodLabel={showPeriodLabel}
                  onCompleteChange={handleCompleteChange}
                  projectName={projectName}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
