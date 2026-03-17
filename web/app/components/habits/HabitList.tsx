"use client";

import { useState, useCallback, useEffect } from "react";
import { Habit, HabitPeriod, Project } from "@weekly/domain";
import { Plus } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { HabitItem } from "./HabitItem";
import { HabitAddModal } from "./HabitAddModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

interface HabitListProps {
  habits: Habit[];
  projects?: Project[];
  hideHeader?: boolean;
  onCompletedCountChange?: (count: number) => void;
}

export function HabitList({ habits, projects, hideHeader, onCompletedCountChange }: HabitListProps) {
  const { activeRepos, getProjectRepos, getHabitProjectId } =
    useRepositoryContext();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    onCompletedCountChange?.(completedIds.size);
  }, [completedIds.size, onCompletedCountChange]);

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
  ) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    repos?.habit.addHabit(name, times, period);
  };

  const sorted = [...habits].sort(
    (a, b) => Number(completedIds.has(a.id)) - Number(completedIds.has(b.id)),
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
                {completedIds.size}/{habits.length}
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
          {habits.length === 0 && (
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
