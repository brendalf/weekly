"use client";

import { useEffect, useMemo, useState } from "react";
import { HabitPeriod } from "@weekly/domain";
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
}

export function HabitItem({ id, name, target, period, userId }: HabitItemProps) {
  const [value, setValue] = useState(0);
  const [today] = useState(() => new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);

  const weekStart = useCalendarStore((s) => s.weekStart);
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const referenceDate = useMemo(() => {
    return selectedDayISO
      ? new Date(selectedDayISO)
      : period === HabitPeriod.Week
        ? weekStart
        : today;
  }, [selectedDayISO, period, weekStart, today]);

  useEffect(() => {
    const unsub = habitProgressRepository.subscribeHabitProgress(
      userId, id, period, referenceDate,
      ({ count }: { count: number }) => setValue(count),
    );
    return () => unsub();
  }, [userId, id, period, referenceDate]);

  const size = 28;
  const stroke = 4;
  const progress = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  const complete = value >= target && target > 0;

  return (
    <>
      <div
        className={[
          "flex items-center gap-2 rounded-xl border border-foreground/10 bg-background p-2 transition-opacity",
          complete ? "opacity-50" : "",
        ].join(" ")}
      >
        <CircularCheckboxProgress
          size={size}
          stroke={stroke}
          progress={progress}
          complete={complete}
          onClick={() => habitProgressRepository.incrementHabit(userId, id, period, target, referenceDate)}
          ariaLabel={complete ? "Completed" : "Mark one done"}
        />

        <button
          onClick={() => setDetailsOpen(true)}
          className="flex flex-1 cursor-pointer items-center justify-between gap-3 overflow-hidden text-left"
        >
          <span className="flex-1 truncate text-sm text-foreground">{name}</span>
          <span className="text-xs text-foreground/60">{value}/{target}</span>
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
