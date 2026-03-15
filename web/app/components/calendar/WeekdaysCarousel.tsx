"use client";

import { useCalendarStore, calendarStore } from "../../stores/calendar";

export function WeekdaysCarousel() {
  const weekStart = useCalendarStore((s) => s.weekStart);
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const weekDays: Date[] = calendarStore.getWeekDays();

  return (
    <div
      key={weekStart.toISOString()}
      className="flex items-center gap-2 overflow-x-auto"
    >
      {weekDays.map((day: Date) => {
        const isSelected = selectedDayISO === day.toISOString();

        return (
          <button
            key={day.toISOString()}
            onClick={() => calendarStore.selectDay(day)}
            className={[
              "flex min-w-[70px] flex-1 cursor-pointer flex-col gap-1 rounded-xl border-2 p-2 text-left transition-colors",
              isSelected
                ? "border-purple-500 bg-purple-300/10"
                : "border-foreground/10 bg-background hover:border-foreground/20",
            ].join(" ")}
          >
            <span className="text-xs text-foreground/60">
              {day.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="text-sm font-medium text-foreground">
              {day.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
