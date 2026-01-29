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
      style={{ alignItems: "center", justifyContent: "center", overflowX: "scroll", marginTop: 8 }}
      gap="$2"
    >
      {weekDays.map((day: Date) => {
        const isSelected = selectedDayISO === day.toISOString();

        return (
          <YStack
            key={day.toISOString()}
            borderWidth={2}
            borderColor={isSelected ? "purple" : "$borderColor"}
            flex={1}
            minW={70}
            gap="$1"
            onPress={() => calendarStore.selectDay(day)}
            style={{ padding: 8, backgroundColor: "#f3f4f6", borderRadius: 10, cursor: "pointer" }}
          >
            <Paragraph size="$1" color="$color10">
              {day.toLocaleDateString("en-US", {
                weekday: "short",
              })}
            </Paragraph>
            <Paragraph size="$2">
              {day.toLocaleDateString("en-US", {
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
