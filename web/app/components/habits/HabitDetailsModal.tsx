"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Surface, useOverlayState } from "@heroui/react";
import {
  Flame,
  TrashBin,
  Pencil,
  Plus,
  Minus,
} from "@gravity-ui/icons";
import {
  Period,
  HabitTimeOfDay,
  HabitCompletionLog,
  periodKeyOf,
  dayKeyOf,
  weekKeyOf,
  monthKeyOf,
  formatPeriodKey,
  formatPeriodKeyFull,
  habitProgress,
  prevPeriodDate,
} from "@weekly/domain";
import { toast } from "sonner";
import { ConfirmButton } from "../ui";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { CommentSection } from "../comments/CommentSection";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { HabitEditFields, useHabitEditForm } from "./HabitEditForm";

interface HabitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string;
  name: string;
  times: number;
  period: Period;
  activeDays?: number[];
  skippedPeriods?: string[];
  timeOfDay?: HabitTimeOfDay;
  referenceDate: Date;
  createdAt: string;
  streak: {
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null;
  /**
   * Open straight into the edit form — the row's `⋯` → Edit. Read once, as
   * initial state: `HabitItem` remounts the modal when the flag changes
   * rather than syncing a prop into state from an effect.
   */
  defaultEditing?: boolean;
}

type SlotStatus =
  | "completed"
  | "partial"
  | "missed"
  | "skipped"
  | "inactive"
  | "future";

interface CalendarSlot {
  key: string;
  label: string;
  status: SlotStatus;
  dayOfMonth?: number;
  dayOfWeek?: number; // 0=Mon..6=Sun for DAY layout
}

function buildSlots(
  period: Period,
  createdAt: string,
  referenceDate: Date,
  logs: HabitCompletionLog[],
  times: number,
  skippedPeriods: string[] | undefined,
  activeDays: number[] | undefined,
): CalendarSlot[] {
  const today = referenceDate;
  const createdDate = new Date(createdAt);
  const currentKey = periodKeyOf(today, period);
  const createdKey = periodKeyOf(createdDate, period);

  // Build a map of period key → completion count from logs
  const countMap = new Map<string, number>();
  for (const log of logs) {
    const key =
      period === Period.DAY
        ? log.dayKey
        : period === Period.WEEK
          ? log.weekKey
          : log.monthKey;
    if (!key) continue;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const slots: CalendarSlot[] = [];

  if (period === Period.DAY) {
    // Walk day by day from createdDate up to today, cap at 84 days (12 weeks)
    const startDate = new Date(createdDate);
    const endDate = new Date(today);
    const diffDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86400000,
    );
    const maxDays = Math.min(diffDays, 83);
    const windowStart = new Date(endDate.getTime() - maxDays * 86400000);

    let d = new Date(windowStart);
    while (dayKeyOf(d) <= dayKeyOf(today)) {
      const key = dayKeyOf(d);
      // ISO day: 0=Mon..6=Sun
      const dow = (d.getDay() + 6) % 7;
      // activeDays uses 0=Sun..6=Sat
      const sundayDow = d.getDay();

      let status: SlotStatus;
      if (key > currentKey) {
        status = "future";
      } else if (skippedPeriods?.includes(key)) {
        status = "skipped";
      } else if (
        activeDays &&
        activeDays.length > 0 &&
        !activeDays.includes(sundayDow)
      ) {
        status = "inactive";
      } else {
        const count = countMap.get(key) ?? 0;
        status =
          count >= times ? "completed" : count > 0 ? "partial" : "missed";
      }

      slots.push({
        key,
        label: String(d.getDate()),
        status,
        dayOfMonth: d.getDate(),
        dayOfWeek: dow,
      });

      d = new Date(d.getTime() + 86400000);
    }
  } else if (period === Period.WEEK) {
    // Walk week by week, cap at 26 weeks
    let d = new Date(today);
    const weekSlots: CalendarSlot[] = [];
    let count = 0;
    while (count < 26) {
      const key = weekKeyOf(d);
      if (key < createdKey) break;
      const completions = countMap.get(key) ?? 0;
      let status: SlotStatus;
      if (key > currentKey) {
        status = "future";
      } else if (skippedPeriods?.includes(key)) {
        status = "skipped";
      } else {
        status =
          completions >= times
            ? "completed"
            : completions > 0
              ? "partial"
              : "missed";
      }
      weekSlots.unshift({ key, label: `W${key.split("-W")[1]}`, status });
      d = prevPeriodDate(d, period);
      count++;
    }
    slots.push(...weekSlots);
  } else {
    // MONTH — walk month by month, cap at 18 months
    let d = new Date(today);
    const monthSlots: CalendarSlot[] = [];
    let count = 0;
    while (count < 18) {
      const key = monthKeyOf(d);
      if (key < createdKey) break;
      const completions = countMap.get(key) ?? 0;
      let status: SlotStatus;
      if (key > currentKey) {
        status = "future";
      } else if (skippedPeriods?.includes(key)) {
        status = "skipped";
      } else {
        status =
          completions >= times
            ? "completed"
            : completions > 0
              ? "partial"
              : "missed";
      }
      const [year, month] = key.split("-");
      const monthName = new Date(
        Number(year),
        Number(month) - 1,
        1,
      ).toLocaleString("en-US", {
        month: "short",
      });
      monthSlots.unshift({ key, label: `${monthName} ${year}`, status });
      d = prevPeriodDate(d, period);
      count++;
    }
    slots.push(...monthSlots);
  }

  return slots;
}

const STATUS_CLASSES: Record<SlotStatus, string> = {
  completed:
    "bg-success-soft text-success-muted border-success/20",
  partial:
    "bg-warning-soft text-warning-muted border-warning/20",
  missed: "bg-fill text-subtle border-border",
  skipped:
    "bg-fill-strong text-subtle border-border line-through",
  inactive: "bg-transparent text-subtle border-transparent",
  future: "bg-transparent text-subtle border-transparent",
};

function DayCalendar({ slots }: { slots: CalendarSlot[] }) {
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  // Group slots into weeks (rows)
  const rows: CalendarSlot[][] = [];
  let currentRow: CalendarSlot[] = [];
  let prevDow = -1;

  for (const slot of slots) {
    const dow = slot.dayOfWeek ?? 0;
    if (prevDow !== -1 && dow <= prevDow) {
      // new week row
      rows.push(currentRow);
      currentRow = [];
    }
    // Pad if first row doesn't start on Monday
    if (currentRow.length === 0 && dow > 0 && rows.length === 0) {
      for (let i = 0; i < dow; i++) {
        currentRow.push({
          key: `pad-${i}`,
          label: "",
          status: "future",
          dayOfWeek: i,
        });
      }
    }
    currentRow.push(slot);
    prevDow = dow;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[280px]">
        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {DAY_LABELS.map((l, i) => (
            <div
              key={i}
              className="text-center text-xs font-medium text-subtle"
            >
              {l}
            </div>
          ))}
        </div>
        {/* Weeks */}
        <div className="flex flex-col gap-0.5">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-0.5">
              {row.map((slot, ci) => (
                <div
                  key={slot.key || `${ri}-${ci}`}
                  title={slot.key}
                  className={[
                    "flex h-7 items-center justify-center rounded border text-xs font-medium",
                    STATUS_CLASSES[slot.status],
                  ].join(" ")}
                >
                  {slot.label}
                </div>
              ))}
              {/* Pad tail of last rows */}
              {Array.from({ length: 7 - row.length }).map((_, i) => (
                <div key={`tail-${i}`} className="h-7" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodStrip({ slots }: { slots: CalendarSlot[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {slots.map((slot) => (
        <div
          key={slot.key}
          title={slot.key}
          className={[
            "rounded border px-2 py-0.5 text-xs font-medium",
            STATUS_CLASSES[slot.status],
          ].join(" ")}
        >
          {slot.label}
        </div>
      ))}
    </div>
  );
}

export function HabitDetailsModal({
  open,
  onOpenChange,
  habitId,
  name,
  times,
  period,
  activeDays,
  skippedPeriods,
  timeOfDay,
  referenceDate,
  createdAt,
  streak,
  defaultEditing = false,
}: HabitDetailsModalProps) {
  const { getHabitRepos, getHabitProjectId } = useRepositoryContext();
  const repos = getHabitRepos(habitId);
  const workspaceId = getHabitProjectId(habitId);

  const [logs, setLogs] = useState<HabitCompletionLog[]>([]);
  const [editing, setEditing] = useState(defaultEditing);
  const [showLogs, setShowLogs] = useState(false);

  // One form, shared with `/app/habits/:id` — see `HabitEditForm`.
  const form = useHabitEditForm({
    id: habitId,
    name,
    times,
    period,
    activeDays,
    timeOfDay,
  });

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setEditing(false);
        setShowLogs(false);
      }
      onOpenChange(isOpen);
    },
  });

  const currentPeriodKey = periodKeyOf(referenceDate, period);
  const periodLogs = logs.filter((l) => l.periodKey === currentPeriodKey);

  const isCurrentPeriod = periodKeyOf(new Date(), period) === currentPeriodKey;
  const periodLabel = isCurrentPeriod
    ? `this ${period}`
    : formatPeriodKeyFull(currentPeriodKey, period);

  useEffect(() => {
    if (!open || !repos) return;
    const unsub = repos.habit.subscribeHabitCompletions(habitId, setLogs);
    return () => unsub();
  }, [open, repos, habitId]);

  const calendarSlots = useMemo(
    () =>
      buildSlots(
        period,
        createdAt,
        referenceDate,
        logs,
        times,
        skippedPeriods,
        activeDays,
      ),
    [period, createdAt, referenceDate, logs, times, skippedPeriods, activeDays],
  );

  function handleDeleteHabit() {
    if (!repos) return;
    state.close();
    repos.habit
      .deleteHabit(habitId)
      .catch(() => toast.error("Failed to delete habit. Please try again."));
  }

  async function handleDeleteLog(log: HabitCompletionLog) {
    if (!repos) return;
    await repos.habit.deleteHabitLog(habitId, log, times);
  }

  async function handleSave() {
    if (await form.save()) setEditing(false);
  }

  function startEditing() {
    form.reset();
    setEditing(true);
  }

  async function handleIncrement() {
    const currentDayCounts = periodLogs.reduce<Record<string, number>>(
      (acc, l) => {
        if (l.dayKey) acc[l.dayKey] = (acc[l.dayKey] ?? 0) + 1;
        return acc;
      },
      {},
    );
    await repos?.habitProgress.incrementHabit(
      habitId,
      period,
      times,
      referenceDate,
      displayCount,
      currentDayCounts,
    );
  }

  async function handleDecrement() {
    if (!repos || periodLogs.length === 0) return;
    const sorted = [...periodLogs].sort((a, b) =>
      (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""),
    );
    const latestLog = sorted[0];
    await repos.habit.deleteHabitLog(habitId, latestLog, times);
  }

  const displayCount = periodLogs.length;
  const { progress, complete } = habitProgress(displayCount, times);

  return (
    <>
      <Modal state={state}>
        <Modal.Backdrop variant="blur">
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <div className="flex items-center gap-2 pr-8 w-full">
                  <span className="flex-1 text-base font-semibold text-foreground truncate">
                    {editing ? `Edit “${name}”` : name}
                  </span>
                </div>
              </Modal.Header>

              <Modal.Body className="p-1">
                {editing && (
                  <HabitEditFields form={form} onSubmit={handleSave} />
                )}

                {/* Progress + streak row */}
                {!editing && (
                  <div className="mb-4 flex flex-col gap-2">
                    <span className="whitespace-nowrap text-xs text-subtle">
                      {periodLabel}
                    </span>
                    <div className="flex items-center gap-3">
                      <CircularCheckboxProgress
                        size={36}
                        stroke={5}
                        progress={progress}
                        complete={complete}
                        onClick={handleIncrement}
                        ariaLabel={complete ? "Completed" : "Mark one done"}
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          isDisabled={periodLogs.length === 0}
                          onPress={handleDecrement}
                          aria-label="Remove one completion"
                        >
                          <Minus />
                        </Button>
                        <span className="min-w-12 text-center font-semibold text-foreground">
                          {displayCount} / {times}
                        </span>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          isDisabled={displayCount >= times}
                          onPress={handleIncrement}
                          aria-label="Add one completion"
                        >
                          <Plus />
                        </Button>
                      </div>
                      {streak && (
                        <div className="ml-auto shrink-0 flex flex-col items-end gap-1">
                          {streak.currentStrikeLength > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-streak-soft px-2.5 py-0.5 text-xs font-medium text-streak">
                              <Flame className="h-3 w-3" />
                              {streak.currentStrikeLength} streak
                            </span>
                          )}
                          {streak.openSincePeriodKey && (
                            <span className="rounded-full bg-fill-strong px-2.5 py-0.5 text-xs text-subtle">
                              since{" "}
                              {formatPeriodKey(
                                streak.openSincePeriodKey,
                                period,
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Calendar / timeline */}
                {!editing && calendarSlots.length > 0 && (
                  <Surface variant="default" className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">
                        History
                      </p>
                      <button
                        onClick={() => setShowLogs((v) => !v)}
                        className="text-xs text-subtle hover:text-muted transition-colors"
                      >
                        {showLogs ? "Hide logs" : "Show logs"}
                      </button>
                    </div>
                    {/* Legend */}
                    <div className="mb-2 flex flex-wrap gap-2 text-xs text-subtle">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-success/30" />
                        Done
                      </span>
                      {times > 1 && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-warning/30" />
                          Partial
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-fill" />
                        Missed
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-fill-strong" />
                        Skipped
                      </span>
                    </div>
                    {period === Period.DAY ? (
                      <DayCalendar slots={calendarSlots} />
                    ) : (
                      <PeriodStrip slots={calendarSlots} />
                    )}

                    {showLogs && (
                      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                        {periodLogs.length === 0 ? (
                          <p className="text-xs text-subtle">
                            No completions this period.
                          </p>
                        ) : (
                          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                            {periodLogs.map((l) => (
                              <div
                                key={l.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                              >
                                <span className="text-xs text-muted">
                                  {l.occurredAt
                                    ? new Date(l.occurredAt).toLocaleString()
                                    : ""}
                                </span>
                                <Button
                                  onPress={() => handleDeleteLog(l)}
                                  className="ml-2 rounded text-subtle transition-colors hover:text-danger-muted"
                                  variant="ghost"
                                  aria-label="Delete completion"
                                >
                                  <TrashBin className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Surface>
                )}

                {!editing && (
                  <CommentSection
                    target="habit"
                    itemId={habitId}
                    itemName={name}
                    workspaceId={workspaceId}
                    isOpen={open}
                  />
                )}
              </Modal.Body>

              <Modal.Footer>
                {editing ? (
                  <>
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onPress={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="min-h-11"
                      isDisabled={!form.isValid || form.isSaving}
                      onPress={handleSave}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onPress={startEditing}
                    >
                      <Pencil />
                      Edit
                    </Button>
                    {/* Two-step, inline — never a modal inside a modal
                        (DIRECTION §5). A habit's history is the one thing in
                        this app an undo toast cannot bring back, so this is
                        the object that confirms. */}
                    <ConfirmButton
                      label="Delete habit"
                      confirmLabel="Delete habit"
                      hint="This also deletes every check-in and the streak built from them."
                      icon={<TrashBin />}
                      onConfirm={handleDeleteHabit}
                    />
                  </>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
