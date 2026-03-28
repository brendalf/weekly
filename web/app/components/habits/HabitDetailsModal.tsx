"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  CirclePause,
  Plus,
  Minus,
} from "@gravity-ui/icons";
import {
  Period,
  HabitTimeOfDay,
  HabitCompletionLog,
  periodKeyOf,
  formatPeriodKey,
  formatPeriodKeyFull,
  habitProgress,
} from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { ActiveDaysSelector } from "./ActiveDaysSelector";
import { TimeOfDaySelector } from "./TimeOfDaySelector";
import { HabitPeriodSelect } from "./HabitPeriodSelect";
import { SkipMenu } from "./SkipMenu";

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
  streak: {
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null;
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

  const [skipMenuOpen, setSkipMenuOpen] = useState(false);
  const [skipMenuPos, setSkipMenuPos] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setEditing(false);
        setSkipMenuOpen(false);
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

  function openSkipMenu() {
    if (skipBtnRef.current) {
      const rect = skipBtnRef.current.getBoundingClientRect();
      setSkipMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setSkipMenuOpen(true);
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

  const skipMenuItemClass =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-foreground/6 transition-colors";

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
                  <div className="mb-4 flex items-center gap-4">
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
                    <CircularCheckboxProgress
                      size={36}
                      stroke={5}
                      progress={progress}
                      complete={complete}
                      onClick={handleIncrement}
                      ariaLabel={complete ? "Completed" : "Mark one done"}
                    />
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
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {displayCount} / {times}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {periodLabel}
                      </span>
                    </div>
                    {streak && (
                      <div className="ml-auto flex flex-col items-end gap-1">
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
                )}

                {/* Completion logs */}
                <Surface variant="default">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Completed at
                    </p>
                    {periodLogs.length === 0 ? (
                      <p className="text-sm text-foreground/60">
                        No completions yet.
                      </p>
                    ) : (
                      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                        {periodLogs.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between rounded-lg border border-foreground/10 bg-background px-3 py-2"
                          >
                            <span className="text-xs text-foreground/60">
                              {l.occurredAt
                                ? new Date(l.occurredAt).toLocaleString()
                                : ""}
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
                </Surface>
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
                      ref={skipBtnRef}
                      onClick={openSkipMenu}
                      className="shrink-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded text-foreground/40 hover:text-foreground/70 transition-colors"
                      aria-label="Skip options"
                    >
                      <CirclePause width={14} height={14} />
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

      {skipMenuOpen &&
        skipMenuPos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSkipMenuOpen(false)}
            />
            <div
              className="fixed z-50 w-52 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-xl p-1"
              style={{ top: skipMenuPos.top, right: skipMenuPos.right }}
            >
              <SkipMenu
                habitId={habitId}
                referenceDate={referenceDate}
                period={period}
                currentPeriodKey={currentPeriodKey}
                isSkipped={isCurrentPeriodSkipped}
                onClose={() => setSkipMenuOpen(false)}
                buttonClassName={skipMenuItemClass}
              />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
