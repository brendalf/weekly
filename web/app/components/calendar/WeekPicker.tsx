"use client";

import { XStack, Button } from "tamagui";
import { getISOWeek } from "@weekly/domain";
import { useCalendarStore, calendarStore } from "../../stores/calendar";

export function WeekPicker() {
  const weekStart = useCalendarStore((s) => s.weekStart);
  const { year, week } = getISOWeek(weekStart);

  return (
    <XStack style={{ justifyContent: "space-between", alignItems: "center" }}>
      <Button size="$2" onPress={() => calendarStore.prevWeek()}>
        ◀
      </Button>
      <p className="text-sm font-semibold text-gray-900">
        Week {week}, {year}
      </p>
      <Button size="$2" onPress={() => calendarStore.nextWeek()}>
        ▶
      </Button>
    </XStack>
  );
}
