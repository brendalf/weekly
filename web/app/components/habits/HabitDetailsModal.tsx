"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Button,
  Surface,
  useOverlayState,
  Input,
  TextField,
} from "@heroui/react";
import {
  Flame,
  TrashBin,
  Pencil,
  Xmark,
  Check,
  Ellipsis,
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
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { ActiveDaysSelector } from "./ActiveDaysSelector";
import { TimeOfDaySelector } from "./TimeOfDaySelector";
import { HabitPeriodSelect } from "./HabitPeriodSelect";
import { HabitActionMenu } from "./HabitActionMenu";

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
}

type SlotStatus = "completed" | "partial" | "missed" | "skipped" | "inactive" | "future";

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
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
    const maxDays = Math.min(diffDays, 83);
    const windowStart = new Date(endDate.getTime() - maxDays * 86400000);

    let d = new Date(windowStart);
    while (dayKeyOf(d) <= dayKeyOf(today)) {
      const key = dayKeyOf(d);
      // ISO day: 0=Mon..6=Sun
      const dow = ((d.getDay() + 6) % 7);
      // activeDays uses 0=Sun..6=Sat
      const sundayDow = d.getDay();

      let status: SlotStatus;
      if (key > currentKey) {
        status = "future";
      } else if (skippedPeriods?.includes(key)) {
        status = "skipped";
      } else if (activeDays && activeDays.length > 0 && !activeDays.includes(sundayDow)) {
        status = "inactive";
      } else {
        const count = countMap.get(key) ?? 0;
        status = count >= times ? "completed" : count > 0 ? "partial" : "missed";
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
        status = completions >= times ? "completed" : completions > 0 ? "partial" : "missed";
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
        status = completions >= times ? "completed" : completions > 0 ? "partial" : "missed";
      }
      const [year, month] = key.split("-");
      const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", {
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
  completed: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20",
  partial: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20",
  missed: "bg-foreground/5 text-foreground/30 border-foreground/10",
  skipped: "bg-foreground/10 text-foreground/40 border-foreground/10 line-through",
  inactive: "bg-transparent text-foreground/15 border-transparent",
  future: "bg-transparent text-foreground/10 border-transparent",
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
        currentRow.push({ key: `pad-${i}`, label: "", status: "future", dayOfWeek: i });
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
            <div key={i} className="text-center text-[10px] font-medium text-foreground/40">
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
                    "flex h-7 items-center justify-center rounded border text-[11px] font-medium",
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
            "rounded border px-2 py-0.5 text-[11px] font-medium",
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
}: HabitDetailsModalProps) {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(habitId);

  const [logs, setLogs] = useState<HabitCompletionLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editTimes, setEditTimes] = useState(String(times));
  const [editPeriod, setEditPeriod] = useState<Period>(period);
  const [editActiveDays, setEditActiveDays] = useState<number[]>(
    activeDays ?? [0, 1, 2, 3, 4, 5, 6],
  );
  const [editTimeOfDay, setEditTimeOfDay] = useState<
    HabitTimeOfDay | undefined
  >(timeOfDay);

  const [showLogs, setShowLogs] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuBtnRef = useRef<HTMLButtonElement>(null);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setEditing(false);
        setActionMenuOpen(false);
        setShowLogs(false);
      }
      onOpenChange(isOpen);
    },
  });

  const currentPeriodKey = periodKeyOf(referenceDate, period);
  const periodLogs = logs.filter((l) => l.periodKey === currentPeriodKey);
  const isCurrentPeriodSkipped =
    skippedPeriods?.includes(currentPeriodKey) ?? false;

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
    () => buildSlots(period, createdAt, referenceDate, logs, times, skippedPeriods, activeDays),
    [period, createdAt, referenceDate, logs, times, skippedPeriods, activeDays],
  );

  async function handleDeleteHabit() {
    if (!repos) return;
    await repos.habit.deleteHabit(habitId);
    state.close();
  }

  async function handleDeleteLog(log: HabitCompletionLog) {
    if (!repos) return;
    await repos.habit.deleteHabitLog(habitId, log, times);
  }

  async function handleSave() {
    if (!repos) return;
    const trimmed = editName.trim();
    const n = Number(editTimes);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    const days =
      editPeriod === Period.DAY && editActiveDays.length < 7
        ? editActiveDays
        : undefined;
    await repos.habit.updateHabit(
      habitId,
      trimmed,
      n,
      editPeriod,
      days,
      editTimeOfDay,
    );
    setEditing(false);
  }

  function startEditing() {
    setEditName(name);
    setEditTimes(String(times));
    setEditPeriod(period);
    setEditActiveDays(activeDays ?? [0, 1, 2, 3, 4, 5, 6]);
    setEditTimeOfDay(timeOfDay);
    setEditing(true);
  }

  async function handleIncrement() {
    await repos?.habitProgress.incrementHabit(
      habitId,
      period,
      times,
      referenceDate,
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
  const isEditValid = Boolean(editName.trim()) && Number(editTimes) > 0;


  return (
    <>
      <Modal state={state}>
        <Modal.Backdrop variant="blur">
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                {editing ? (
                  <div className="flex flex-col gap-2 w-full pr-8">
                    <TextField name="editName">
                      <Input
                        value={editName}
                        variant="secondary"
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </TextField>
                    <div className="mt-1 flex items-end gap-2">
                      <Input
                        type="number"
                        value={editTimes}
                        className="max-w-20"
                        variant="secondary"
                        onChange={(e) => setEditTimes(e.target.value)}
                      />
                      <HabitPeriodSelect
                        value={editPeriod}
                        onChange={setEditPeriod}
                      />
                    </div>
                    {editPeriod === Period.DAY && (
                      <div className="mt-2">
                        <p className="text-xs text-foreground/50 mb-1">
                          Active days
                        </p>
                        <ActiveDaysSelector
                          activeDays={editActiveDays}
                          onChange={setEditActiveDays}
                        />
                      </div>
                    )}
                    <div className="mt-2">
                      <p className="text-xs text-foreground/50 mb-1">
                        Time of day
                      </p>
                      <TimeOfDaySelector
                        value={editTimeOfDay}
                        onChange={setEditTimeOfDay}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pr-8 w-full">
                    <span className="flex-1 text-base font-semibold text-foreground truncate">
                      {name}
                    </span>
                  </div>
                )}
              </Modal.Header>

              <Modal.Body className="p-1">
                {/* Progress + streak row */}
                {!editing && (
                  <div className="mb-4 flex flex-col gap-2">
                    <span className="whitespace-nowrap text-xs text-foreground/50">
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
                            <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-500">
                              <Flame className="h-3 w-3" />
                              {streak.currentStrikeLength} streak
                            </span>
                          )}
                          {streak.openSincePeriodKey && (
                            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs text-foreground/50">
                              since{" "}
                              {formatPeriodKey(streak.openSincePeriodKey, period)}
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
                      <p className="text-sm font-semibold text-foreground">History</p>
                      <button
                        onClick={() => setShowLogs((v) => !v)}
                        className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                      >
                        {showLogs ? "Hide logs" : "Show logs"}
                      </button>
                    </div>
                    {/* Legend */}
                    <div className="mb-2 flex flex-wrap gap-2 text-[10px] text-foreground/50">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-green-500/30" />
                        Done
                      </span>
                      {times > 1 && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-amber-500/30" />
                          Partial
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-foreground/10" />
                        Missed
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-foreground/15" />
                        Skipped
                      </span>
                    </div>
                    {period === Period.DAY ? (
                      <DayCalendar slots={calendarSlots} />
                    ) : (
                      <PeriodStrip slots={calendarSlots} />
                    )}

                    {showLogs && (
                      <div className="mt-3 flex flex-col gap-1 border-t border-foreground/10 pt-3">
                        {periodLogs.length === 0 ? (
                          <p className="text-xs text-foreground/50">No completions this period.</p>
                        ) : (
                          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                            {periodLogs.map((l) => (
                              <div
                                key={l.id}
                                className="flex items-center justify-between rounded-lg border border-foreground/10 bg-background px-3 py-2"
                              >
                                <span className="text-xs text-foreground/60">
                                  {l.occurredAt ? new Date(l.occurredAt).toLocaleString() : ""}
                                </span>
                                <Button
                                  onPress={() => handleDeleteLog(l)}
                                  className="ml-2 rounded text-foreground/30 transition-colors hover:text-red-500"
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

              </Modal.Body>

              <Modal.Footer>
                {editing ? (
                  <>
                    <Button variant="ghost" onPress={() => setEditing(false)}>
                      <Xmark />
                    </Button>
                    <Button isDisabled={!isEditValid} onPress={handleSave}>
                      <Check />
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      ref={actionMenuBtnRef}
                      onClick={() => setActionMenuOpen((v) => !v)}
                      className="shrink-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground/40 hover:text-foreground/70 transition-colors"
                      aria-label="More options"
                    >
                      <Ellipsis width={14} height={14} />
                    </button>
                    <Button variant="ghost" onPress={startEditing}>
                      <Pencil />
                    </Button>
                    <Button variant="danger" onPress={handleDeleteHabit}>
                      <TrashBin />
                    </Button>
                  </>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <HabitActionMenu
        habitId={habitId}
        referenceDate={referenceDate}
        period={period}
        currentPeriodKey={currentPeriodKey}
        isSkipped={isCurrentPeriodSkipped}
        triggerRef={actionMenuBtnRef}
        isOpen={actionMenuOpen}
        onOpenChange={setActionMenuOpen}
      />
    </>
  );
}
