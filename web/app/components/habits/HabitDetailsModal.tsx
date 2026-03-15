"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Surface,
  useOverlayState,
  Input,
  TextField,
  Select,
  ListBox,
} from "@heroui/react";
import { Flame, TrashBin, Pencil, Xmark, Check } from "@gravity-ui/icons";
import {
  HabitPeriod,
  HabitCompletionLog,
  periodKeyOf,
  formatPeriodKey,
  formatPeriodKeyFull,
  habitProgress,
} from "@weekly/domain";
import { habitRepository, habitProgressRepository } from "../../repositories";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";

interface HabitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  habitId: string;
  name: string;
  times: number;
  period: HabitPeriod;
  value: number;
  referenceDate: Date;
  streak: {
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null;
}

export function HabitDetailsModal({
  open,
  onOpenChange,
  userId,
  habitId,
  name,
  times,
  period,
  value,
  referenceDate,
  streak,
}: HabitDetailsModalProps) {
  const [logs, setLogs] = useState<HabitCompletionLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editTimes, setEditTimes] = useState(String(times));
  const [editPeriod, setEditPeriod] = useState<HabitPeriod>(period);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) setEditing(false);
      onOpenChange(isOpen);
    },
  });

  const currentPeriodKey = periodKeyOf(referenceDate, period);
  const periodLogs = logs.filter((l) => l.periodKey === currentPeriodKey);

  const isCurrentPeriod =
    periodKeyOf(new Date(), period) === currentPeriodKey;

  const periodLabel = isCurrentPeriod
    ? `this ${period}`
    : formatPeriodKeyFull(currentPeriodKey, period);

  useEffect(() => {
    if (!open) return;
    const unsub = habitRepository.subscribeHabitCompletions(
      userId,
      habitId,
      setLogs,
    );
    return () => unsub();
  }, [open, userId, habitId]);

  async function handleDeleteHabit() {
    await habitRepository.deleteHabit(userId, habitId);
    state.close();
  }

  async function handleDeleteLog(log: HabitCompletionLog) {
    await habitRepository.deleteHabitLog(userId, habitId, log, times);
  }

  async function handleSave() {
    const trimmed = editName.trim();
    const n = Number(editTimes);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    await habitRepository.updateHabit(userId, habitId, trimmed, n, editPeriod);
    setEditing(false);
  }

  function startEditing() {
    setEditName(name);
    setEditTimes(String(times));
    setEditPeriod(period);
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
  }

  const { progress, complete } = habitProgress(value, times);
  const isEditValid = Boolean(editName.trim()) && Number(editTimes) > 0;

  return (
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
                    <Select
                      fullWidth
                      placeholder="Period"
                      variant="secondary"
                      value={editPeriod}
                      onChange={(e) => setEditPeriod(e as HabitPeriod)}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id={HabitPeriod.Day}
                            textValue={HabitPeriod.Day}
                          >
                            per day
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id={HabitPeriod.Week}
                            textValue={HabitPeriod.Week}
                          >
                            per week
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id={HabitPeriod.Month}
                            textValue={HabitPeriod.Month}
                          >
                            per month
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                </div>
              ) : (
                <Modal.Heading>{name}</Modal.Heading>
              )}
            </Modal.Header>

            <Modal.Body className="p-1">
              {/* Progress + streak row */}
              <div className="mb-4 flex items-center gap-4">
                <CircularCheckboxProgress
                  size={36}
                  stroke={5}
                  progress={progress}
                  complete={complete}
                  onClick={() =>
                    habitProgressRepository.incrementHabit(
                      userId,
                      habitId,
                      period,
                      times,
                      referenceDate,
                    )
                  }
                  ariaLabel={complete ? "Completed" : "Mark one done"}
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {value} / {times}
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
                        since {formatPeriodKey(streak.openSincePeriodKey, period)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Completion logs for current period */}
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
                  <Button variant="ghost" onPress={handleCancelEdit}>
                    <Xmark />
                  </Button>
                  <Button isDisabled={!isEditValid} onPress={handleSave}>
                    <Check />
                  </Button>
                </>
              ) : (
                <>
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
  );
}
