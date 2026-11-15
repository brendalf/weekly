"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRotateLeft } from "@gravity-ui/icons";
import { getISOWeek } from "@weekly/domain";
import { useCalendarStore, calendarStore } from "../../stores/calendar";
import { focusRing, touchTarget } from "../ui";

/**
 * The compact week stepper, used by `/app/review` (`/app/week` has its own
 * `WeekHeader`).
 *
 * WS14 replaced the three HeroUI `size="sm" isIconOnly` buttons: at 32×32 they
 * were under the 44px minimum (DIRECTION §6.8) and the chevrons inside them
 * were 14px. They are now plain buttons on the same `touchTarget` + `focusRing`
 * pair every other icon control in the app uses.
 */
const navButton = [
  "flex cursor-pointer items-center justify-center rounded-lg text-muted",
  "transition-colors hover:bg-fill hover:text-foreground",
  touchTarget,
  focusRing,
].join(" ");

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
      <button
        type="button"
        onClick={() => calendarStore.prevWeek()}
        aria-label="Previous week"
        className={navButton}
      >
        <ChevronLeft width={16} height={16} aria-hidden />
      </button>
      <span className="min-w-[80px] text-center text-xs font-medium text-muted">
        Week {week}, {year}
      </span>
      <button
        type="button"
        onClick={() => calendarStore.nextWeek()}
        aria-label="Next week"
        className={navButton}
      >
        <ChevronRight width={16} height={16} aria-hidden />
      </button>
      {!isToday && (
        <button
          type="button"
          onClick={goToToday}
          aria-label="Back to today"
          className={navButton}
        >
          <ArrowRotateLeft width={16} height={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
