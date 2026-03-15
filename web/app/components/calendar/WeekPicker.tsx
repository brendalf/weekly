"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight, ArrowRotateLeft } from "@gravity-ui/icons";
import { getISOWeek } from "@weekly/domain";
import { useCalendarStore, calendarStore } from "../../stores/calendar";

export function WeekPicker() {
  const weekStart = useCalendarStore((s) => s.weekStart);
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const { year, week } = getISOWeek(weekStart);

  const [todayISO] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toISOString();
  });

  const isToday = selectedDayISO === todayISO;

  function goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    calendarStore.setWeekStart(today);
    calendarStore.selectDay(today);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        onPress={() => calendarStore.prevWeek()}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs font-medium text-foreground/60 min-w-[80px] text-center">
        Week {week}, {year}
      </span>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        onPress={() => calendarStore.nextWeek()}
        aria-label="Next week"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      {!isToday && (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          onPress={goToToday}
          aria-label="Back to today"
        >
          <ArrowRotateLeft className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
