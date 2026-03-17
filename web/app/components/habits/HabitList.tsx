"use client";

import { useState, useCallback } from "react";
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
}

export function HabitList({ habits, projects, hideHeader }: HabitListProps) {
  const { activeRepos, getProjectRepos, getHabitProjectId } =
    useRepositoryContext();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

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
        <div className="flex items-center justify-between rounded-lg border bg-surface py-1 px-4">
          <p className="text-sm font-bold text-foreground">Habits</p>
          {(activeRepos || projects) && (
            <HabitAddModal
              onSubmit={handleAddHabit}
              projects={projects}
              trigger={
                <Button
                  size="sm"
                  isIconOnly
                  aria-label="Add habit"
                  variant="ghost"
                >
                  <Plus />
                </Button>
              }
            />
          )}
        </div>
      )}

      {habits.length === 0 && (
        <p className="text-xs text-foreground/60">No habits yet.</p>
      )}

      <div className="flex flex-col gap-0.5">
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
  );
}
