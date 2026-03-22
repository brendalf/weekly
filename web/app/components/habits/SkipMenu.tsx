"use client";

import { useState } from "react";
import type { DateValue } from "@internationalized/date";
import { getLocalTimeZone } from "@internationalized/date";
import {
  Period,
  getSkipPeriodKeys,
  periodKeyOf,
} from "@weekly/domain";
import {
  Clock,
  Calendar,
  ArrowRight,
  ArrowChevronLeft,
  CirclePlay,
} from "@gravity-ui/icons";
import { Calendar as HeroCalendar, Button } from "@heroui/react";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

interface SkipMenuProps {
  habitId: string;
  referenceDate: Date;
  period: Period;
  currentPeriodKey: string;
  isSkipped: boolean;
  /** Called after a skip/unskip action completes (used by HabitItem to close the menu). */
  onClose?: () => void;
  /** CSS class for each action button. */
  buttonClassName: string;
}

type SkipView = "buttons" | "calendar";

export function SkipMenu({
  habitId,
  referenceDate,
  period,
  currentPeriodKey,
  isSkipped,
  onClose,
  buttonClassName,
}: SkipMenuProps) {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(habitId);

  const [skipView, setSkipView] = useState<SkipView>("buttons");
  const [skipUntilDate, setSkipUntilDate] = useState<DateValue | null>(null);

  function reset() {
    setSkipView("buttons");
    setSkipUntilDate(null);
  }

  async function handleSkip(type: "today" | "week" | "month") {
    if (!repos) return;
    await repos.habit.skipHabit(habitId, getSkipPeriodKeys(referenceDate, period, type));
    reset();
    onClose?.();
  }

  async function handleSkipUntil() {
    if (!repos || !skipUntilDate) return;
    const until = skipUntilDate.toDate(getLocalTimeZone());
    await repos.habit.skipHabit(
      habitId,
      getSkipPeriodKeys(referenceDate, period, "until", until),
    );
    reset();
    onClose?.();
  }

  async function handleUnskip() {
    if (!repos) return;
    await repos.habit.unskipHabit(habitId, currentPeriodKey);
    reset();
    onClose?.();
  }

  if (isSkipped) {
    return (
      <button onClick={handleUnskip} className={buttonClassName}>
        <CirclePlay width={14} height={14} className="text-foreground/60" />
        Unskip this period
      </button>
    );
  }

  if (skipView === "calendar") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            setSkipView("buttons");
            setSkipUntilDate(null);
          }}
          className="flex cursor-pointer items-center gap-1.5 self-start text-xs text-foreground/50 hover:text-foreground transition-colors"
        >
          <ArrowChevronLeft width={12} height={12} />
          Skip until
        </button>
        <HeroCalendar
          value={skipUntilDate}
          onChange={setSkipUntilDate}
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
        <Button size="sm" isDisabled={!skipUntilDate} onPress={handleSkipUntil}>
          Confirm
        </Button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => handleSkip("today")} className={buttonClassName}>
        <Clock width={14} height={14} className="text-foreground/60" />
        Skip today
      </button>
      <button onClick={() => handleSkip("week")} className={buttonClassName}>
        <Calendar width={14} height={14} className="text-foreground/60" />
        Skip this week
      </button>
      <button onClick={() => handleSkip("month")} className={buttonClassName}>
        <Calendar width={14} height={14} className="text-foreground/60" />
        Skip this month
      </button>
      <button onClick={() => setSkipView("calendar")} className={buttonClassName}>
        <ArrowRight width={14} height={14} className="text-foreground/60" />
        Skip until…
      </button>
    </>
  );
}

// Re-export periodKeyOf for convenience of callers that need it alongside SkipMenu
export { periodKeyOf };
