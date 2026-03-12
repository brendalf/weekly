"use client";

import { Button } from "@heroui/react";
import { getISOWeek } from "@weekly/domain";
import { useCalendarStore, calendarStore } from "../../stores/calendar";

export function WeekPicker() {
  const weekStart = useCalendarStore((s) => s.weekStart);
  const { year, week } = getISOWeek(weekStart);

  return (
    <h1 className="flex items-center justify-between mt-4 text-3xl font-semibold tracking-tight text-foreground">
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        onPress={() => calendarStore.prevWeek()}
        aria-label="Previous week"
      >
        ◀
      </Button>
      <p className="font-semibold text-foreground">
        Week {week}, {year}
      </p>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        onPress={() => calendarStore.nextWeek()}
        aria-label="Next week"
      >
        ▶
      </Button>
    </h1>
  );
}
