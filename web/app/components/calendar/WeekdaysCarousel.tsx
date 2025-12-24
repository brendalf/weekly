"use client";

import { XStack, YStack, Paragraph } from "tamagui";
import { useCalendarStore, calendarStore } from "../../stores/calendar";

export function WeekdaysCarousel() {
  const weekStart = useCalendarStore((s) => s.weekStart);
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const weekDays: Date[] = calendarStore.getWeekDays();

  return (
    <XStack
      key={weekStart.toISOString()}
      flex={1}
      items="center"
      justify="center"
      overflow="scroll"
      mt="$2"
      gap="$2"
    >
      {weekDays.map((day: Date) => {
        const isSelected = selectedDayISO === day.toISOString();

        return (
          <YStack
            key={day.toISOString()}
            p="$2"
            borderWidth={2}
            borderColor={isSelected ? "purple" : "$borderColor"}
            bg="$background"
            flex={1}
            minW={70}
            gap="$1"
            onPress={() => calendarStore.selectDay(day)}
            cursor="pointer"
          >
            <Paragraph size="$1" color="$color10">
              {day.toLocaleDateString(undefined, {
                weekday: "short",
              })}
            </Paragraph>
            <Paragraph size="$2">
              {day.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
              })}
            </Paragraph>
          </YStack>
        );
      })}
    </XStack>
  );
}
