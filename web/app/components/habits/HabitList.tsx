"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Habit, HabitPeriod, Project, filterHabitsByDay, isHabitSkipped } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { HabitItem } from "./HabitItem";
import { HabitAddModal } from "./HabitAddModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useCalendarStore } from "../../stores/calendar";

interface HabitListProps {
  habits: Habit[];
  projects?: Project[];
  hideHeader?: boolean;
  onHabitsCompleted?: (completions: Record<string, boolean>) => void;
}

export function HabitList({ habits, projects, hideHeader, onHabitsCompleted }: HabitListProps) {
  const { activeRepos, getProjectRepos, getHabitProjectId } =
    useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const selectedDay = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : new Date()),
    [selectedDayISO],
  );

  const visibleHabits = useMemo(
    () => filterHabitsByDay(habits, selectedDay),
    [habits, selectedDay],
  );

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

  const handleCompleteChange = useCallback((id: string, complete: boolean) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (complete) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleAddHabit = (
    name: string,
    times: number,
    period: HabitPeriod,
    projectId?: string,
    activeDays?: number[],
  ) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    const date = selectedDayISO ? new Date(selectedDayISO) : new Date();
    repos?.habit.addHabit(name, times, period, date, activeDays);
  };

  const sorted = useMemo(
    () =>
      [...visibleHabits].sort(
        (a, b) => Number(completedIds.has(a.id)) - Number(completedIds.has(b.id)),
      ),
    [visibleHabits, completedIds],
  );

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
          {(activeRepos || projects) && (
            <div onClick={(e) => e.stopPropagation()}>
              <HabitAddModal
                onSubmit={handleAddHabit}
                projects={projects}
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
              const projectName = projects
                ? projects.find((p) => p.id === getHabitProjectId(habit.id))?.name
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
                  isSkipped={isHabitSkipped(habit, selectedDay)}
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
