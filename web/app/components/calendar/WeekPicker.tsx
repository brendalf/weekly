"use client";

import { XStack, Paragraph, Button } from "tamagui";
import { getISOWeek } from "@weekly/domain";
import { useCalendarStore, calendarStore } from "../../stores/calendar";

export function WeekPicker() {
  const weekStart = useCalendarStore((s) => s.weekStart);
  const { year, week } = getISOWeek(weekStart);

  return (
    <XStack justify="space-between" items="center">
      <Button size="$2" onPress={() => calendarStore.prevWeek()}>
        ◀
      </Button>
      <Paragraph size="$2">
        Week {week}, {year}
      </Paragraph>
      <Button size="$2" onPress={() => calendarStore.nextWeek()}>
        ▶
      </Button>
    </XStack>
  );
}
