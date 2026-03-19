"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateValue } from "@internationalized/date";
import { getLocalTimeZone } from "@internationalized/date";
import {
  HabitPeriod,
  HabitTimeOfDay,
  formatPeriodKey,
  habitProgress,
  getSkipPeriodKeys,
  periodKeyOf,
  dayKeyOf,
} from "@weekly/domain";
import {
  Flame,
  Ellipsis,
  CirclePause,
  CirclePlay,
  Clock,
  Calendar,
  ArrowRight,
  ArrowChevronLeft,
} from "@gravity-ui/icons";
import {
  Calendar as HeroCalendar,
  Button,
} from "@heroui/react";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { useCalendarStore } from "../../stores/calendar";
import { HabitDetailsModal } from "./HabitDetailsModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

const PERIOD_BADGE: Record<HabitPeriod, { label: string; className: string }> = {
  [HabitPeriod.Day]: { label: "Today", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  [HabitPeriod.Week]: { label: "This week", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  [HabitPeriod.Month]: { label: "This month", className: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
};

export interface HabitItemProps {
  id: string;
  name: string;
  target: number;
  period: HabitPeriod;
  createdAt: string;
  activeDays?: number[];
  skippedPeriods?: string[];
  timeOfDay?: HabitTimeOfDay;
  isSkipped?: boolean;
  showPeriodLabel?: boolean;
  onCompleteChange?: (id: string, complete: boolean, hasProgressToday: boolean) => void;
  projectName?: string;
}

type MenuView = "main" | "options" | "calendar";

export function HabitItem({
  id,
  name,
  target,
  period,
  createdAt,
  activeDays,
  skippedPeriods,
  timeOfDay,
  isSkipped = false,
  showPeriodLabel = false,
  onCompleteChange,
  projectName,
}: HabitItemProps) {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(id);

  const [value, setValue] = useState(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState<{
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null>(null);
  const [today] = useState(() => new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [untilDate, setUntilDate] = useState<DateValue | null>(null);

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const referenceDate = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : today),
    [selectedDayISO, today],
  );

  const currentPeriodKey = periodKeyOf(referenceDate, period);

  useEffect(() => {
    if (!repos) return;
    const unsub = repos.habitProgress.subscribeHabitProgress(
      id,
      period,
      referenceDate,
      ({ count, dayCounts }: { count: number; dayCounts: Record<string, number> }) => {
        setValue(count);
        setDayCounts(dayCounts);
      },
    );
    return () => unsub();
  }, [repos, id, period, referenceDate]);

  useEffect(() => {
    if (!repos) return;
    const unsub = repos.habitProgress.subscribeHabitStreak(
      id,
      period,
      new Date(createdAt),
      referenceDate,
      (s) => setStreak(s),
      skippedPeriods,
    );
    return () => unsub();
  }, [repos, id, period, createdAt, referenceDate, skippedPeriods]);

  const { progress, complete } = habitProgress(value, target);

  const hasProgressToday =
    (period === HabitPeriod.Week || period === HabitPeriod.Month) &&
    (dayCounts[dayKeyOf(referenceDate)] ?? 0) > 0;

  useEffect(() => {
    if (!isSkipped) onCompleteChange?.(id, complete, hasProgressToday);
  }, [id, complete, hasProgressToday, onCompleteChange, isSkipped]);

  function openMenu() {
    setMenuView("main");
    setUntilDate(null);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setMenuView("main");
    setUntilDate(null);
  }

  async function handleSkip(type: "today" | "week" | "month") {
    if (!repos) return;
    await repos.habit.skipHabit(id, getSkipPeriodKeys(referenceDate, period, type));
    closeMenu();
  }

  async function handleSkipUntil() {
    if (!repos || !untilDate) return;
    const until = untilDate.toDate(getLocalTimeZone());
    await repos.habit.skipHabit(id, getSkipPeriodKeys(referenceDate, period, "until", until));
    closeMenu();
  }

  async function handleUnskip() {
    if (!repos) return;
    await repos.habit.unskipHabit(id, currentPeriodKey);
    closeMenu();
  }

  const size = 28;
  const stroke = 4;

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-foreground/6 transition-colors";

  return (
    <>
      <div
        className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-background p-2 hover:border-foreground/20 transition-colors"
      >
        {/* Inner content that gets dimmed when skipped/complete */}
        <div
          className={[
            "flex flex-1 items-center gap-2 overflow-hidden",
            isSkipped || complete ? "opacity-50" : "",
          ].join(" ")}
        >
          <CircularCheckboxProgress
            size={size}
            stroke={stroke}
            progress={isSkipped ? 0 : progress}
            complete={!isSkipped && complete}
            onClick={
              isSkipped
                ? undefined
                : () => repos?.habitProgress.incrementHabit(id, period, target, referenceDate)
            }
            ariaLabel={complete ? "Completed" : "Mark one done"}
          />

          <button
            onClick={() => setDetailsOpen(true)}
            className="flex flex-1 cursor-pointer items-center justify-between gap-3 overflow-hidden text-left"
          >
            <span
              className={[
                "flex-1 truncate text-sm text-foreground",
                isSkipped ? "line-through" : "",
              ].join(" ")}
            >
              {name}
            </span>
            {showPeriodLabel && !isSkipped && (
              <span className={["shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium", PERIOD_BADGE[period].className].join(" ")}>
                {PERIOD_BADGE[period].label}
              </span>
            )}
            {isSkipped && (
              <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/50">
                Skipped
              </span>
            )}
            {projectName && !isSkipped && (
              <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/50">
                {projectName}
              </span>
            )}
            {!isSkipped && (
              <span className="text-xs text-foreground/60">
                {value}/{target}
              </span>
            )}
            {!isSkipped && streak && streak.currentStrikeLength > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-500">
                <Flame className="h-3 w-3" />
                {streak.currentStrikeLength}
              </span>
            )}
            {!isSkipped && streak?.openSincePeriodKey && (
              <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/50">
                {formatPeriodKey(streak.openSincePeriodKey, period)}
              </span>
            )}
          </button>
        </div>

        {/* ⋯ menu — outside opacity wrapper so dropdown stays fully visible; hidden when complete */}
        {!complete && <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpen) closeMenu(); else openMenu();
            }}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-foreground/40 hover:text-foreground/70 transition-colors"
            aria-label="More options"
          >
            <Ellipsis width={14} height={14} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={closeMenu}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-xl">
                {/* ── Level 1: main ── */}
                {menuView === "main" && (
                  <div className="p-1">
                    {isSkipped ? (
                      <button onClick={handleUnskip} className={menuItemClass}>
                        <CirclePlay width={14} height={14} className="shrink-0 text-foreground/60" />
                        Unskip
                      </button>
                    ) : (
                      <button
                        onClick={() => setMenuView("options")}
                        className={menuItemClass}
                      >
                        <CirclePause width={14} height={14} className="shrink-0 text-foreground/60" />
                        Skip
                        <ArrowChevronLeft
                          width={12}
                          height={12}
                          className="ml-auto rotate-180 text-foreground/30"
                        />
                      </button>
                    )}
                  </div>
                )}

                {/* ── Level 2: skip options ── */}
                {menuView === "options" && (
                  <div className="p-1">
                    <button
                      onClick={() => setMenuView("main")}
                      className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-foreground/50 hover:text-foreground transition-colors"
                    >
                      <ArrowChevronLeft width={12} height={12} />
                      Skip
                    </button>
                    <div className="my-1 mx-2 border-t border-foreground/10" />
                    <button onClick={() => handleSkip("today")} className={menuItemClass}>
                      <Clock width={14} height={14} className="shrink-0 text-foreground/60" />
                      Skip today
                    </button>
                    <button onClick={() => handleSkip("week")} className={menuItemClass}>
                      <Calendar width={14} height={14} className="shrink-0 text-foreground/60" />
                      Skip this week
                    </button>
                    <button onClick={() => handleSkip("month")} className={menuItemClass}>
                      <Calendar width={14} height={14} className="shrink-0 text-foreground/60" />
                      Skip this month
                    </button>
                    <button onClick={() => setMenuView("calendar")} className={menuItemClass}>
                      <ArrowRight width={14} height={14} className="shrink-0 text-foreground/60" />
                      Skip until…
                    </button>
                  </div>
                )}

                {/* ── Level 3: date picker ── */}
                {menuView === "calendar" && (
                  <div className="p-2 flex flex-col gap-2">
                    <button
                      onClick={() => setMenuView("options")}
                      className="flex cursor-pointer items-center gap-1.5 self-start text-xs text-foreground/50 hover:text-foreground transition-colors"
                    >
                      <ArrowChevronLeft width={12} height={12} />
                      Skip until
                    </button>
                    <HeroCalendar
                      value={untilDate}
                      onChange={setUntilDate}
                      aria-label="Pick skip-until date"
                    >
                      <HeroCalendar.Header>
                        <HeroCalendar.NavButton slot="previous" />
                        <HeroCalendar.Heading />
                        <HeroCalendar.NavButton slot="next" />
                      </HeroCalendar.Header>
                      <HeroCalendar.Grid>
                        <HeroCalendar.GridHeader>
                          {(day) => (
                            <HeroCalendar.HeaderCell>{day}</HeroCalendar.HeaderCell>
                          )}
                        </HeroCalendar.GridHeader>
                        <HeroCalendar.GridBody>
                          {(date) => <HeroCalendar.Cell date={date} />}
                        </HeroCalendar.GridBody>
                      </HeroCalendar.Grid>
                    </HeroCalendar>
                    <Button
                      size="sm"
                      isDisabled={!untilDate}
                      onPress={handleSkipUntil}
                      className="w-full"
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>}
      </div>

      <HabitDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        habitId={id}
        name={name}
        times={target}
        period={period}
        activeDays={activeDays}
        skippedPeriods={skippedPeriods}
        timeOfDay={timeOfDay}
        value={value}
        referenceDate={referenceDate}
        streak={streak}
      />
    </>
  );
}
