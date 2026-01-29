"use client";

import { XStack } from "tamagui";
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
      userId,
      id,
      period,
      referenceDate,
      ({ count }: { count: number }) => {
        setValue(count);
      }
    );
    return () => unsub();
  }, [userId, id, period, referenceDate]);

  const size = 28;
  const stroke = 4;
  const progress = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  const complete = value >= target && target > 0;

  return (
    <>
      <XStack
        gap="$2"
        opacity={complete ? 0.5 : 1}
        style={{
          alignItems: "center",
          padding: 10,
          backgroundColor: "#f3f4f6",
          borderRadius: 12,
        }}
      >
        <CircularCheckboxProgress
          size={size}
          stroke={stroke}
          progress={progress}
          complete={complete}
          onClick={() => habitProgressRepository.incrementHabit(userId, id, period, target, referenceDate)}
          ariaLabel={complete ? "Completed" : "Mark one done"}
        />

        <div
          onClick={() => setDetailsOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            width: "100%",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span className="text-sm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </span>
          </div>

          <span className="text-xs text-gray-500">
            {value}/{target}
          </span>
        </div>
      </XStack>

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
