"use client";

import { XStack } from "tamagui";
import { useEffect, useState } from "react";
import { HabitPeriod } from "@weekly/domain";
import { subscribeToHabitProgress, incrementHabit } from "../../stores/habitProgress";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";

export interface HabitItemProps {
  id: string;
  name: string;
  target: number;
  period: HabitPeriod;
  userId: string;
}

export function HabitItem({ id, name, target, period, userId }: HabitItemProps) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const unsub = subscribeToHabitProgress(userId, id, period, ({ count }) => {
      setValue(count);
    });
    return () => unsub();
  }, [userId, id, period]);
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
        onClick={() => incrementHabit(userId, id, period, target)}
        ariaLabel={complete ? "Completed" : "Mark one done"}
      />
      <div className="ml-1" style={{ display: "flex", flexDirection: "column" }}>
        <span className="text-sm">{name}</span>
        <span className="text-xs text-gray-500">{value}/{target}</span>
      </div>
    </XStack>
  );
}
