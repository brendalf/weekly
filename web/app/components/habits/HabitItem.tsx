"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Period,
  HabitTimeOfDay,
  formatPeriodKey,
  getActiveSkipKey,
  habitProgress,
  periodKeyOf,
  dayKeyOf,
} from "@weekly/domain";
import { Flame, Ellipsis } from "@gravity-ui/icons";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { Badge } from "../general/Badge";
import { PeriodBadge } from "../general/PeriodBadge";
import { HabitActionMenu } from "./HabitActionMenu";
import { useCalendarStore } from "../../stores/calendar";
import { HabitDetailsModal } from "./HabitDetailsModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";
import { toast } from "sonner";

export interface HabitItemProps {
  id: string;
  name: string;
  target: number;
  period: Period;
  createdAt: string;
  activeDays?: number[];
  skippedPeriods?: string[];
  timeOfDay?: HabitTimeOfDay;
  isSkipped?: boolean;
  showPeriodLabel?: boolean;
  onCompleteChange?: (
    id: string,
    complete: boolean,
    hasProgressToday: boolean,
  ) => void;
  projectName?: string;
}

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
  const { getHabitRepos, getHabitProjectId } = useRepositoryContext();
  const repos = getHabitRepos(id);

  const [value, setValue] = useState(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);
  const [optimisticProgressToday, setOptimisticProgressToday] = useState<boolean | null>(null);
  const [streak, setStreak] = useState<{
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null>(null);
  const [today] = useState(() => new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);

  const referenceDate = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : today),
    [selectedDayISO, today],
  );

  const currentPeriodKey = useMemo(
    () => periodKeyOf(referenceDate, period),
    [referenceDate, period],
  );

  const activeSkipKey = useMemo(
    () => getActiveSkipKey(skippedPeriods ?? [], referenceDate),
    [skippedPeriods, referenceDate],
  );

  const handleUnskip = useCallback(async () => {
    if (!repos || !activeSkipKey) return;
    await repos.habit.unskipHabit(id, activeSkipKey);
  }, [repos, id, activeSkipKey]);

  useEffect(() => {
    if (!repos) return;
    const unsub = repos.habitProgress.subscribeHabitProgress(
      id,
      period,
      referenceDate,
      ({
        count,
        dayCounts,
      }: {
        count: number;
        dayCounts: Record<string, number>;
      }) => {
        setValue(count);
        setDayCounts(dayCounts);
      },
    );
    return () => unsub();
  }, [repos, id, period, referenceDate]);

  // Serialize arrays to primitives so the effect only re-fires when contents change,
  // not when Firestore creates new array objects on each snapshot.
  const skippedPeriodsKey = skippedPeriods?.join('\0') ?? '';
  const activeDaysKey = activeDays?.join(',') ?? '';

  useEffect(() => {
    if (!repos) return;
    const unsub = repos.habitProgress.subscribeHabitStreak(
      id,
      period,
      new Date(createdAt),
      referenceDate,
      (s) => setStreak(s),
      skippedPeriods,
      activeDays,
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, id, period, createdAt, referenceDate, skippedPeriodsKey, activeDaysKey]);

  const displayValue = optimisticCount ?? value;
  const { progress, complete } = habitProgress(displayValue, target);

  const hasProgressToday =
    optimisticProgressToday ??
    ((period === Period.WEEK || period === Period.MONTH) &&
      (dayCounts[dayKeyOf(referenceDate)] ?? 0) > 0);

  useEffect(() => {
    if (!isSkipped) onCompleteChange?.(id, complete, hasProgressToday);
  }, [id, complete, hasProgressToday, onCompleteChange, isSkipped]);

  function handleIncrement() {
    if (!repos || isSkipped) return;

    const prevCount = optimisticCount ?? value;
    const nextCount = Math.min(prevCount + 1, Math.max(1, target));
    setOptimisticCount(nextCount);
    if (period === Period.WEEK || period === Period.MONTH) {
      setOptimisticProgressToday(true);
    }

    repos.habitProgress
      .incrementHabit(id, period, target, referenceDate)
      .then(() => {
        setOptimisticCount(null);
        setOptimisticProgressToday(null);
        if (nextCount >= target) {
          const projectId = getHabitProjectId(id);
          const user = auth.currentUser;
          if (projectId && user) {
            workspaceRepository
              .logActivity(projectId, {
                type: "habit_completed",
                actorUid: user.uid,
                actorDisplayName: user.displayName ?? "User",
                itemId: id,
                itemName: name,
              })
              .catch(() => {
                // non-critical, ignore
              });
          }
        }
      })
      .catch(() => {
        setOptimisticCount(null);
        setOptimisticProgressToday(null);
        toast.error("Failed to update habit. Please try again.");
      });
  }

  const size = 28;
  const stroke = 4;

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-background p-2 hover:border-foreground/20 transition-colors">
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
            onClick={isSkipped ? undefined : handleIncrement}
            ariaLabel={complete ? "Completed" : "Mark one done"}
          />

          {projectName && !isSkipped && (
            <Badge className="shrink-0 bg-foreground/10 text-foreground/50">
              {projectName}
            </Badge>
          )}

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
            {showPeriodLabel && !isSkipped && <PeriodBadge period={period} />}
            {isSkipped && (
              <Badge className="shrink-0 bg-foreground/10 text-foreground/50">
                Skipped
              </Badge>
            )}
            {!isSkipped && (
              <span className="text-xs text-foreground/60">
                {displayValue}/{target}
              </span>
            )}
            {!isSkipped && streak && streak.currentStrikeLength > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-500">
                <Flame className="h-3 w-3" />
                {streak.currentStrikeLength}
              </span>
            )}
            {!isSkipped && streak?.openSincePeriodKey && (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {formatPeriodKey(streak.openSincePeriodKey, period)}
              </Badge>
            )}
          </button>
        </div>

        {/* ⋯ menu — outside opacity wrapper so dropdown stays fully visible; hidden when complete */}
        {!complete && (
          <div>
            <button
              ref={menuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-foreground/40 hover:text-foreground/70 transition-colors"
              aria-label="More options"
            >
              <Ellipsis width={14} height={14} />
            </button>
            <HabitActionMenu
              habitId={id}
              referenceDate={referenceDate}
              period={period}
              currentPeriodKey={currentPeriodKey}
              isSkipped={isSkipped}
              onUnskip={handleUnskip}
              triggerRef={menuButtonRef}
              isOpen={menuOpen}
              onOpenChange={setMenuOpen}
            />
          </div>
        )}
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
        referenceDate={referenceDate}
        createdAt={createdAt}
        streak={streak}
      />
    </>
  );
}
