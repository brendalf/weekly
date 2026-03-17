"use client";

import { useEffect, useMemo, useState } from "react";
import { HabitPeriod, formatPeriodKey, habitProgress } from "@weekly/domain";
import { Flame } from "@gravity-ui/icons";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { useCalendarStore } from "../../stores/calendar";
import { HabitDetailsModal } from "./HabitDetailsModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

export interface HabitItemProps {
  id: string;
  name: string;
  target: number;
  period: HabitPeriod;
  createdAt: string;
  onCompleteChange?: (id: string, complete: boolean) => void;
  projectName?: string;
}

export function HabitItem({
  id,
  name,
  target,
  period,
  createdAt,
  onCompleteChange,
  projectName,
}: HabitItemProps) {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(id);

  const [value, setValue] = useState(0);
  const [streak, setStreak] = useState<{
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null>(null);
  const [today] = useState(() => new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const referenceDate = useMemo(() => {
    return selectedDayISO ? new Date(selectedDayISO) : today;
  }, [selectedDayISO, today]);

  useEffect(() => {
    if (!repos) return;
    const unsub = repos.habitProgress.subscribeHabitProgress(
      id,
      period,
      referenceDate,
      ({ count }: { count: number }) => setValue(count),
    );
    return () => unsub();
  }, [repos, id, period, referenceDate]);

  useEffect(() => {
    if (!repos) return;
    const unsub = repos.habitProgress.subscribeHabitStreak(
      id,
      period,
      new Date(createdAt),
      referenceDate,
      (s) => setStreak(s),
    );
    return () => unsub();
  }, [repos, id, period, createdAt, referenceDate]);

  const { progress, complete } = habitProgress(value, target);

  useEffect(() => {
    onCompleteChange?.(id, complete);
  }, [id, complete, onCompleteChange]);

  const size = 28;
  const stroke = 4;

  return (
    <>
      <div
        className={[
          "flex items-center gap-2 rounded-lg border border-foreground/10 bg-background hover:border-foreground/20 p-2 transition-opacity",
          complete ? "opacity-50" : "",
        ].join(" ")}
      >
        <CircularCheckboxProgress
          size={size}
          stroke={stroke}
          progress={progress}
          complete={complete}
          onClick={() =>
            repos?.habitProgress.incrementHabit(
              id,
              period,
              target,
              referenceDate,
            )
          }
          ariaLabel={complete ? "Completed" : "Mark one done"}
        />

        <button
          onClick={() => setDetailsOpen(true)}
          className="flex flex-1 cursor-pointer items-center justify-between gap-3 overflow-hidden text-left"
        >
          <span className="flex-1 truncate text-sm text-foreground">
            {name}
          </span>
          {projectName && (
            <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/50">
              {projectName}
            </span>
          )}
          <span className="text-xs text-foreground/60">
            {value}/{target}
          </span>
          {streak && streak.currentStrikeLength > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-500">
              <Flame className="h-3 w-3" />
              {streak.currentStrikeLength}
            </span>
          )}
          {streak?.openSincePeriodKey && (
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/50">
              {formatPeriodKey(streak.openSincePeriodKey, period)}
            </span>
          )}
        </button>
      </div>

      <HabitDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        habitId={id}
        name={name}
        times={target}
        period={period}
        value={value}
        referenceDate={referenceDate}
        streak={streak}
      />
    </>
  );
}
