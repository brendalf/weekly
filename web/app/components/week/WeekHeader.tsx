"use client";

import { useId, useMemo } from "react";
import {
  addDays,
  dayKeyOf,
  getISOWeek,
  getStartOfWeek,
  getWeekDays,
  weekdayIndex,
  weekRangeLabel,
} from "@weekly/domain";
import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";
import { focusRing, touchTarget } from "../ui";
import { calendarStore, useCalendarStore } from "../../stores/calendar";

/**
 * The week planner's time control — all of it, in one object (PLAN WS4).
 *
 * `/app/week` used to stack three of these: a `WeekPicker` row, a
 * `WeekdaysCarousel` of seven bordered cards, and a row of period tabs. Close
 * to 200px of chrome before a single habit appeared, and three separate things
 * to parse before you knew what you were looking at.
 *
 * This is one card, and it is deliberately hierarchical:
 *
 * - **the week names itself** — `Week 42`, the largest type on the route after
 *   the shell's `<h1>`, with its date span underneath;
 * - **the days live inside it** — one continuous seven-cell strip, hairlines
 *   not gaps, so it reads as *a week divided into days* rather than seven
 *   peers competing with it (DIRECTION §1). Picking a day drills in; it never
 *   changes which week you are planning.
 *
 * The strip is also fixed-width now: the old carousel was `min-w-[70px] × 7`
 * with `overflow-x-auto` and no scroll affordance, so on a 375px phone two
 * days were simply off-screen (PLAN WS13). Seven `flex-1` cells always fit.
 *
 * It fixes one behavioral bug on the way: `WeekPicker` moved `weekStart` and
 * left `selectedDayISO` alone, so paging to another week changed the strip but
 * not a single habit or task — the page only caught up once you clicked a day.
 * Here, moving weeks carries the weekday with you (Thursday → Thursday).
 */
export function WeekHeader() {
  const headingId = useId();
  const storedWeekStart = useCalendarStore((s) => s.weekStart);
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  // Everything below the header reads `selectedDayISO`, so the strip is drawn
  // around *that* day. `weekStart` normally agrees; when it does not — another
  // route paged the week without moving the selection — the selected day wins,
  // and the header can never advertise a week the lists are not showing.
  const weekStart = useMemo(() => {
    const selected = selectedDayISO ? new Date(selectedDayISO) : new Date();
    const fromSelection = getStartOfWeek(selected);
    return dayKeyOf(fromSelection) === dayKeyOf(storedWeekStart)
      ? storedWeekStart
      : fromSelection;
  }, [storedWeekStart, selectedDayISO]);

  const { week } = getISOWeek(weekStart);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const selectedKey = selectedDayISO ? dayKeyOf(new Date(selectedDayISO)) : null;
  const todayKey = dayKeyOf(new Date());
  const isOnToday = selectedKey === todayKey;

  /** Page a week, keeping the weekday you were on. */
  function goToWeek(delta: number) {
    const offset = selectedDayISO
      ? weekdayIndex(new Date(selectedDayISO))
      : weekdayIndex(new Date());
    const nextStart = getStartOfWeek(addDays(weekStart, delta * 7));
    calendarStore.setWeekStart(nextStart);
    calendarStore.selectDay(addDays(nextStart, offset));
  }

  return (
    <section
      // Named from the week itself, so the landmark reads "Week 42" rather
      // than repeating the shell's "Week" <h1>.
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2 sm:px-4">
        <div className="min-w-0 flex-1">
          <h2
            id={headingId}
            className="truncate text-lg leading-tight font-semibold tracking-tight text-foreground"
          >
            Week {week}
          </h2>
          {/* No year: `weekRangeLabel` adds one only where it disambiguates. */}
          <p className="truncate text-xs text-muted">
            {weekRangeLabel(weekStart)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => goToWeek(-1)}
            className={navButton}
          >
            <ChevronLeft width={16} height={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => calendarStore.goToToday()}
            disabled={isOnToday}
            className={`rounded-lg px-3 text-sm font-medium transition-colors ${touchTarget} ${focusRing} ${
              isOnToday
                ? "cursor-default text-subtle"
                : "cursor-pointer text-brand-muted hover:bg-fill"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => goToWeek(1)}
            className={navButton}
          >
            <ChevronRight width={16} height={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* One strip, divided — not seven cards. */}
      <div className="flex border-t border-border">
        {weekDays.map((day) => {
          const key = dayKeyOf(day);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={day.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              onClick={() => calendarStore.selectDay(day)}
              className={[
                "flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5",
                "border-l border-border px-1 py-2 transition-colors first:border-l-0",
                // Inset ring: the strip is flush inside an `overflow-hidden`
                // card, so an outward one would be clipped. Spelled out rather
                // than composed from `focusRing`, which sets the other offset.
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand",
                isSelected
                  ? "bg-brand text-brand-foreground"
                  : "text-muted hover:bg-fill",
              ].join(" ")}
            >
              <span className="text-xs">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span
                className={[
                  "text-sm tabular-nums",
                  isSelected
                    ? "font-semibold"
                    : isToday
                      ? "font-semibold text-brand-muted"
                      : "font-medium text-foreground",
                ].join(" ")}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const navButton = [
  "flex cursor-pointer items-center justify-center rounded-lg text-subtle",
  "transition-colors hover:bg-fill hover:text-foreground",
  touchTarget,
  focusRing,
].join(" ");
