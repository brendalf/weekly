"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Period,
  HabitTimeOfDay,
  formatPeriodKey,
  habitProgress,
  periodKeyOf,
  dayKeyOf,
} from "@weekly/domain";
import {
  Flame,
  Ellipsis,
  CirclePause,
  CirclePlay,
  ArrowChevronLeft,
} from "@gravity-ui/icons";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { Badge } from "../general/Badge";
import { PeriodBadge } from "../general/PeriodBadge";
import { SkipMenu } from "./SkipMenu";
import { useCalendarStore } from "../../stores/calendar";
import { HabitDetailsModal } from "./HabitDetailsModal";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { projectRepository } from "../../repositories";
import { auth } from "../../config/firebase";


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

type MenuView = "main" | "options";

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
  const [streak, setStreak] = useState<{
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null>(null);
  const [today] = useState(() => new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
    (period === Period.WEEK || period === Period.MONTH) &&
    (dayCounts[dayKeyOf(referenceDate)] ?? 0) > 0;

  useEffect(() => {
    if (!isSkipped) onCompleteChange?.(id, complete, hasProgressToday);
  }, [id, complete, hasProgressToday, onCompleteChange, isSkipped]);

  function openMenu() {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuView("main");
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setMenuView("main");
  }

  async function handleIncrement() {
    if (!repos || isSkipped) return;
    await repos.habitProgress.incrementHabit(id, period, target, referenceDate);
    // Log activity when this increment completes the habit
    if (value + 1 >= target) {
      const projectId = getHabitProjectId(id);
      const user = auth.currentUser;
      if (projectId && user) {
        try {
          await projectRepository.logActivity(projectId, {
            type: "habit_completed",
            actorUid: user.uid,
            actorDisplayName: user.displayName ?? "User",
            itemId: id,
            itemName: name,
          });
        } catch {
          // non-critical, ignore
        }
      }
    }
  }

  const size = 28;
  const stroke = 4;

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-foreground/6 transition-colors";

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
            {showPeriodLabel && !isSkipped && (
              <PeriodBadge period={period} />
            )}
            {isSkipped && (
              <Badge className="shrink-0 bg-foreground/10 text-foreground/50">
                Skipped
              </Badge>
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
                if (menuOpen) closeMenu();
                else openMenu();
              }}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-foreground/40 hover:text-foreground/70 transition-colors"
              aria-label="More options"
            >
              <Ellipsis width={14} height={14} />
            </button>

            {menuOpen &&
              menuPos &&
              createPortal(
                <>
                  <div className="fixed inset-0 z-40" onClick={closeMenu} />
                  <div
                    className="fixed z-50 w-52 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-xl"
                    style={{ top: menuPos.top, right: menuPos.right }}
                  >
                    {/* ── Level 1: main ── */}
                    {menuView === "main" && (
                      <div className="p-1">
                        {isSkipped ? (
                          <button onClick={closeMenu} className={menuItemClass}>
                            <CirclePlay
                              width={14}
                              height={14}
                              className="shrink-0 text-foreground/60"
                            />
                            Unskip
                          </button>
                        ) : (
                          <button
                            onClick={() => setMenuView("options")}
                            className={menuItemClass}
                          >
                            <CirclePause
                              width={14}
                              height={14}
                              className="shrink-0 text-foreground/60"
                            />
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

                    {/* ── Level 2: skip options (via SkipMenu) ── */}
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
                        <SkipMenu
                          habitId={id}
                          referenceDate={referenceDate}
                          period={period}
                          currentPeriodKey={currentPeriodKey}
                          isSkipped={isSkipped}
                          onClose={closeMenu}
                          buttonClassName={menuItemClass}
                        />
                      </div>
                    )}
                  </div>
                </>,
                document.body,
              )}
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
        value={value}
        referenceDate={referenceDate}
        streak={streak}
      />
    </>
  );
}
