"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Period,
  HabitTimeOfDay,
  formatPeriodKey,
  getActiveSkipKey,
  habitProgress,
  periodKeyOf,
  dayKeyOf,
} from "@weekly/domain";
import type { HabitCompletionLog } from "@weekly/domain";
import { Flame } from "@gravity-ui/icons";
import { toast } from "sonner";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { Badge } from "../general/Badge";
import { PeriodBadge } from "../general/PeriodBadge";
import { HabitActionMenu } from "./HabitActionMenu";
import { useCalendarStore } from "../../stores/calendar";
import { HabitDetailsModal } from "./HabitDetailsModal";
import type { RepoSet } from "../../contexts/RepositoryContext";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useActivityLog } from "../../hooks/useActivityLog";
import {
  ROW_ATTR,
  rowControl,
  rowLink,
  rowShell,
  useRowKeys,
} from "../../hooks/useRowKeys";

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
  /**
   * Route for this habit's detail panel (`/app/habits/:id`). When set the row
   * title becomes a real link and the legacy `HabitDetailsModal` is not
   * rendered — the panel route owns the detail (DIRECTION §5).
   *
   * Omit it and the row keeps the modal, which is what `/app/week` still does
   * until WS4/WS5 finish moving the modal's body into the panel.
   */
  detailHref?: string;
}

/**
 * Reads the habit's completion log once, without leaving a subscription
 * behind.
 *
 * Un-marking needs the *most recent* log of the current period, and
 * `HabitProgressRepository` only exposes an aggregate count. Rather than add a
 * second live listener to every habit row — the thing that would actually cost
 * something on a long list — this opens `subscribeHabitCompletions`, takes the
 * first snapshot, and closes it again. Firestore never delivers that snapshot
 * synchronously, but the unsubscribe is deferred anyway so a synchronous
 * repository implementation (a test fake) cannot leak.
 */
function readCompletionsOnce(
  repos: RepoSet,
  habitId: string,
): Promise<HabitCompletionLog[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | null = null;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub?.();
      reject(new Error("Timed out reading habit completions"));
    }, 10_000);

    unsub = repos.habit.subscribeHabitCompletions(habitId, (logs) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(logs);
      queueMicrotask(() => unsub?.());
    });
  });
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
  detailHref,
}: HabitItemProps) {
  const router = useRouter();
  const { getHabitRepos, getHabitProjectId } = useRepositoryContext();
  const repos = getHabitRepos(id);
  const logActivity = useActivityLog();

  const [value, setValue] = useState(0);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);
  const [optimisticProgressToday, setOptimisticProgressToday] = useState<
    boolean | null
  >(null);
  const [streak, setStreak] = useState<{
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null>(null);
  const [today] = useState(() => new Date());
  /** `editing` opens the detail straight into its edit form (the `⋯` → Edit). */
  const [detail, setDetail] = useState({ open: false, editing: false });

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
  const skippedPeriodsKey = skippedPeriods?.join("\0") ?? "";
  const activeDaysKey = activeDays?.join(",") ?? "";

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
  }, [
    repos,
    id,
    period,
    createdAt,
    referenceDate,
    skippedPeriodsKey,
    activeDaysKey,
  ]);

  const displayValue = optimisticCount ?? value;
  const { progress, complete } = habitProgress(displayValue, target);

  const hasProgressToday =
    optimisticProgressToday ??
    ((period === Period.WEEK || period === Period.MONTH) &&
      (dayCounts[dayKeyOf(referenceDate)] ?? 0) > 0);

  useEffect(() => {
    if (!isSkipped) onCompleteChange?.(id, complete, hasProgressToday);
  }, [id, complete, hasProgressToday, onCompleteChange, isSkipped]);

  /**
   * Announces a mark to the workspace feed. Recurring habits get one entry per
   * mark so members can see which day each mark landed on, and whether that
   * mark closed the period.
   */
  const logMark = useCallback(
    (countAfterMark: number) => {
      logActivity(getHabitProjectId(id), {
        type: countAfterMark >= target ? "habit_completed" : "habit_progress",
        itemId: id,
        itemName: name,
        habitPeriod: period,
        periodKey: currentPeriodKey,
        dayKey: dayKeyOf(referenceDate),
        progressCount: countAfterMark,
        progressTarget: target,
      });
    },
    [
      logActivity,
      getHabitProjectId,
      id,
      name,
      period,
      currentPeriodKey,
      referenceDate,
      target,
    ],
  );

  function handleIncrement() {
    if (!repos) return;

    const prevCount = optimisticCount ?? value;
    const nextCount = Math.min(prevCount + 1, Math.max(1, target));
    setOptimisticCount(nextCount);
    if (period === Period.WEEK || period === Period.MONTH) {
      setOptimisticProgressToday(true);
    }

    repos.habitProgress
      .incrementHabit(id, period, target, referenceDate, value, dayCounts)
      .then(() => {
        setOptimisticCount(null);
        setOptimisticProgressToday(null);
        logMark(nextCount);
      })
      .catch(() => {
        setOptimisticCount(null);
        setOptimisticProgressToday(null);
        toast.error("Failed to update habit. Please try again.");
      });
  }

  /**
   * Removes the most recent mark of the current period — the fix for
   * DIRECTION §7's "a completed habit cannot be un-marked from the row".
   */
  async function handleDecrement() {
    if (!repos) return;
    const prevCount = optimisticCount ?? value;
    if (prevCount <= 0) return;

    setOptimisticCount(prevCount - 1);
    try {
      const logs = await readCompletionsOnce(repos, id);
      const latest = logs
        .filter((log) => log.periodKey === currentPeriodKey)
        .sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""))
        .at(0);
      if (!latest) {
        setOptimisticCount(null);
        return;
      }
      await repos.habit.deleteHabitLog(id, latest, target);
      setOptimisticCount(null);
      setOptimisticProgressToday(null);
    } catch {
      setOptimisticCount(null);
      toast.error("Failed to update habit. Please try again.");
    }
  }

  /** One ring, both directions: add a mark until the target is met, then undo one. */
  const handleRingPress = isSkipped
    ? undefined
    : complete
      ? handleDecrement
      : handleIncrement;

  const rowKeys = useRowKeys({ onToggle: handleRingPress });

  function openDetail(editing: boolean) {
    if (detailHref) {
      router.push(detailHref);
      return;
    }
    setDetail({ open: true, editing });
  }

  const dimmed = isSkipped || complete;
  const titleContent = (
    <span
      className={[
        "block truncate text-sm text-foreground",
        isSkipped ? "line-through" : "",
      ].join(" ")}
    >
      {name}
    </span>
  );

  return (
    <>
      <div className={`${rowShell} items-center p-2`} {...rowKeys}>
        <CircularCheckboxProgress
          className={`${rowControl} ${dimmed ? "opacity-50" : ""}`}
          size={28}
          stroke={4}
          progress={isSkipped ? 0 : progress}
          complete={!isSkipped && complete}
          onClick={handleRingPress}
          ariaLabel={
            isSkipped
              ? "Skipped"
              : complete
                ? `Un-mark ${name}`
                : `Mark one done for ${name}`
          }
        />

        <div
          className={[
            "flex min-w-0 flex-1 items-center gap-2 overflow-hidden",
            dimmed ? "opacity-50" : "",
          ].join(" ")}
        >
          {projectName && !isSkipped && (
            <Badge className="shrink-0 bg-fill-strong text-subtle">
              {projectName}
            </Badge>
          )}

          {detailHref ? (
            <Link
              href={detailHref}
              className={rowLink}
              {...{ [ROW_ATTR]: "habit" }}
            >
              {titleContent}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openDetail(false)}
              className={rowLink}
              {...{ [ROW_ATTR]: "habit" }}
            >
              {titleContent}
            </button>
          )}

          <span className="flex shrink-0 items-center gap-2">
            {showPeriodLabel && !isSkipped && <PeriodBadge period={period} />}
            {isSkipped && (
              <Badge className="bg-fill-strong text-subtle">Skipped</Badge>
            )}
            {!isSkipped && (
              <span className="text-xs text-muted">
                {displayValue}/{target}
              </span>
            )}
            {!isSkipped && streak && streak.currentStrikeLength > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-streak-soft px-1.5 py-0.5 text-xs font-medium text-streak">
                <Flame className="h-3 w-3" />
                {streak.currentStrikeLength}
              </span>
            )}
            {!isSkipped && streak?.openSincePeriodKey && (
              <Badge className="bg-warning-soft text-warning-muted">
                {formatPeriodKey(streak.openSincePeriodKey, period)}
              </Badge>
            )}
          </span>
        </div>

        {/* Always rendered — the `{!complete && …}` guard that hid every row
            action once a habit was finished is gone (DIRECTION §7). */}
        <HabitActionMenu
          habitId={id}
          name={name}
          period={period}
          referenceDate={referenceDate}
          activeSkipKey={activeSkipKey}
          isSkipped={isSkipped}
          onEdit={() => openDetail(true)}
        />
      </div>

      {!detailHref && (
        // Remounting on the edit flag lets the modal pick it up as initial
        // state — no `useEffect` + `setState` to sync a prop into state.
        <HabitDetailsModal
          key={detail.editing ? "edit" : "view"}
          open={detail.open}
          defaultEditing={detail.editing}
          onOpenChange={(open) => setDetail((d) => ({ ...d, open }))}
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
      )}
    </>
  );
}
