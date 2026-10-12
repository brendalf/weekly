"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@heroui/react";
import { ArrowsRotateRight, Plus } from "@gravity-ui/icons";
import {
  Period,
  TIME_OF_DAY_ORDER,
  isHabitSkipped,
  type Habit,
  type HabitTimeOfDay,
} from "@weekly/domain";
import { Collapsible, EmptyState } from "../../components/ui";
import { HabitAddModal } from "../../components/habits/HabitAddModal";
import { HabitItem } from "../../components/habits/HabitItem";
import { useAppData } from "../../components/shell/AppDataProvider";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useActivityLog } from "../../hooks/useActivityLog";
import { useCalendarStore } from "../../stores/calendar";
import { useWorkspaceSelection } from "../../stores/workspace";

/** Habit recurrence groups, in the order a habit's commitment tightens. */
const PERIOD_GROUPS: { period: Period; label: string }[] = [
  { period: Period.DAY, label: "Daily" },
  { period: Period.WEEK, label: "Weekly" },
  { period: Period.MONTH, label: "Monthly" },
];

function timeOfDayRank(timeOfDay?: HabitTimeOfDay): number {
  return timeOfDay ? (TIME_OF_DAY_ORDER[timeOfDay] ?? 3) : 3;
}

/**
 * `/app/habits` — every habit the user keeps, grouped by how it recurs
 * (DIRECTION §3). Unlike `/app/week`, nothing here is filtered by the selected
 * day: this is the management view.
 *
 * WS5 owns the rest of it: per-row target / streak / active days /
 * completion rate, the period · time-of-day · workspace filters, `showSkipped`
 * as a visible chip, and the archive section.
 */
export function HabitsList() {
  const { habits, pickerWorkspaces, showSkippedHabits, workspaces } =
    useAppData();
  const { activeRepos, getWorkspaceRepos, getHabitProjectId } =
    useRepositoryContext();
  const logActivity = useActivityLog();
  const selection = useWorkspaceSelection();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const selectedDay = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : new Date()),
    [selectedDayISO],
  );

  const handleAddHabit = useCallback(
    async (
      name: string,
      times: number,
      period: Period,
      workspaceId?: string,
      activeDays?: number[],
      timeOfDay?: HabitTimeOfDay,
    ) => {
      const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
      const habitId = await repos?.habit.addHabit(
        name,
        times,
        period,
        new Date(),
        activeDays,
        timeOfDay,
      );
      if (!habitId) return;
      logActivity(workspaceId ?? selection.singleId, {
        type: "habit_added",
        itemId: habitId,
        itemName: name,
      });
    },
    [activeRepos, getWorkspaceRepos, logActivity, selection.singleId],
  );

  const grouped = useMemo(() => {
    const byPeriod = new Map<Period, Habit[]>();
    for (const { period } of PERIOD_GROUPS) byPeriod.set(period, []);
    for (const habit of habits) {
      if (!showSkippedHabits && isHabitSkipped(habit, selectedDay)) continue;
      byPeriod.get(habit.period)?.push(habit);
    }
    for (const list of byPeriod.values()) {
      list.sort(
        (a, b) =>
          timeOfDayRank(a.timeOfDay) - timeOfDayRank(b.timeOfDay) ||
          a.name.localeCompare(b.name),
      );
    }
    return byPeriod;
  }, [habits, showSkippedHabits, selectedDay]);

  const addButton = (
    <HabitAddModal
      onSubmit={handleAddHabit}
      workspaces={pickerWorkspaces}
      trigger={
        <Button size="sm" variant="outline" className="min-h-11">
          <Plus width={16} height={16} />
          Add habit
        </Button>
      }
    />
  );

  if (habits.length === 0) {
    return (
      <EmptyState
        icon={<ArrowsRotateRight width={20} height={20} />}
        headline="No habits yet"
        body="A habit is a commitment that comes back — daily, weekly, or monthly. Weekly measures it by how consistently you keep it."
        action={addButton}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">{addButton}</div>

      {PERIOD_GROUPS.map(({ period, label }) => {
        const groupHabits = grouped.get(period) ?? [];
        if (groupHabits.length === 0) return null;
        return (
          <Collapsible
            key={period}
            label={label}
            count={groupHabits.length}
            storageKey={`habits:${period}`}
            bodyClassName="flex flex-col gap-0.5 pt-1"
          >
            {groupHabits.map((habit) => (
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
                showPeriodLabel={false}
                detailHref={`/app/habits/${habit.id}`}
                projectName={
                  selection.isSingle
                    ? undefined
                    : workspaces.find((w) => w.id === getHabitProjectId(habit.id))
                        ?.name
                }
              />
            ))}
          </Collapsible>
        );
      })}
    </div>
  );
}
