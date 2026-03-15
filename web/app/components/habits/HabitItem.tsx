"use client";

import { useEffect, useMemo, useState } from "react";
import { HabitPeriod } from "@weekly/domain";
import { Flame } from "@gravity-ui/icons";
import { habitProgressRepository } from "../../repositories";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { useCalendarStore } from "../../stores/calendar";
import { HabitDetailsDialog } from "./HabitDetailsDialog";

export interface HabitItemProps {
  id: string;
  name: string;
  target: number;
  period: HabitPeriod;
  userId: string;
  createdAt: string;
}

function formatOpenSince(periodKey: string, period: HabitPeriod): string {
  if (period === HabitPeriod.Week) {
    const [, w] = periodKey.split("-W");
    return `Week ${parseInt(w, 10)}`;
  }
  if (period === HabitPeriod.Month) {
    const [y, m] = periodKey.split("-");
    return new Date(+y, +m - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  const [y, m, d] = periodKey.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function HabitItem({
  id,
  name,
  target,
  period,
  userId,
  createdAt,
}: HabitItemProps) {
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
    const unsub = habitProgressRepository.subscribeHabitProgress(
      userId,
      id,
      period,
      referenceDate,
      ({ count }: { count: number }) => setValue(count),
    );
    return () => unsub();
  }, [userId, id, period, referenceDate]);

  useEffect(() => {
    const unsub = habitProgressRepository.subscribeHabitStreak(
      userId,
      id,
      period,
      new Date(createdAt),
      referenceDate,
      (s) => setStreak(s),
    );
    return () => unsub();
  }, [userId, id, period, createdAt, referenceDate]);

  const size = 28;
  const stroke = 4;
  const progress = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  const complete = value >= target && target > 0;

  return (
    <>
      <div
        className={[
          "flex items-center gap-2 rounded-xl border border-foreground/10 bg-background hover:border-foreground/20 p-2 transition-opacity",
          complete ? "opacity-50" : "",
        ].join(" ")}
      >
        <CircularCheckboxProgress
          size={size}
          stroke={stroke}
          progress={progress}
          complete={complete}
          onClick={() =>
            habitProgressRepository.incrementHabit(
              userId,
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
              {formatOpenSince(streak.openSincePeriodKey, period)}
            </span>
          )}
        </button>
      </div>

      <HabitDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        userId={userId}
        habitId={id}
        name={name}
        times={target}
        period={period}
      />
    </>
  );
}
