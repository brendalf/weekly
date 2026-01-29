"use client";

import { XStack } from "tamagui";
import { useEffect, useState } from "react";
import { HabitPeriod } from "@weekly/domain";
import { subscribeToHabitProgress, incrementHabit } from "../../stores/habitProgress";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { useCalendarStore } from "../../stores/calendar";

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

  const weekStart = useCalendarStore((s) => s.weekStart);
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const referenceDate = selectedDayISO
    ? new Date(selectedDayISO)
    : period === HabitPeriod.Week
      ? weekStart
      : today;

  const referenceKey = selectedDayISO
    ? selectedDayISO
    : period === HabitPeriod.Week
      ? weekStart.toISOString()
      : today.toISOString();

  useEffect(() => {
    const unsub = subscribeToHabitProgress(
      userId,
      id,
      period,
      referenceDate,
      ({ count }: { count: number }) => {
        setValue(count);
      }
    );
    return () => unsub();
  }, [userId, id, period, referenceKey]);
  const size = 28;
  const stroke = 4;
  const progress = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  const complete = value >= target && target > 0;

  return (
    <XStack style={{ alignItems: "center" }} gap="$2" opacity={complete ? 0.5 : 1}>
      <CircularCheckboxProgress
        size={size}
        stroke={stroke}
        progress={progress}
        complete={complete}
        onClick={() => incrementHabit(userId, id, period, target, referenceDate)}
        ariaLabel={complete ? "Completed" : "Mark one done"}
      />
      <div className="ml-1" style={{ display: "flex", flexDirection: "column" }}>
        <span className="text-sm">{name}</span>
      </div>
      <div>
        <span className="text-xs text-gray-500">{value}/{target}</span>
      </div>
    </XStack>
  );
}
