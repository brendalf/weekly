"use client";

import { useEffect, useState } from "react";
import type { DateValue } from "@internationalized/date";
import { getLocalTimeZone } from "@internationalized/date";
import {
  Modal,
  Button,
  Surface,
  useOverlayState,
  Input,
  TextField,
  Select,
  ListBox,
  Calendar,
} from "@heroui/react";
import {
  Flame,
  TrashBin,
  Pencil,
  Xmark,
  Check,
  Clock,
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowChevronLeft,
  CirclePlay,
} from "@gravity-ui/icons";
import {
  HabitPeriod,
  HabitTimeOfDay,
  HabitCompletionLog,
  periodKeyOf,
  formatPeriodKey,
  formatPeriodKeyFull,
  habitProgress,
  getSkipPeriodKeys,
} from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface HabitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string;
  name: string;
  times: number;
  period: HabitPeriod;
  activeDays?: number[];
  skippedPeriods?: string[];
  timeOfDay?: HabitTimeOfDay;
  value: number;
  referenceDate: Date;
  streak: {
    currentStrikeLength: number;
    openSincePeriodKey: string | null;
  } | null;
}

type SkipView = "buttons" | "calendar";

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
  value,
  referenceDate,
  streak,
}: HabitDetailsModalProps) {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(habitId);

  const [logs, setLogs] = useState<HabitCompletionLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editTimes, setEditTimes] = useState(String(times));
  const [editPeriod, setEditPeriod] = useState<HabitPeriod>(period);
  const [editActiveDays, setEditActiveDays] = useState<number[]>(
    activeDays ?? [0, 1, 2, 3, 4, 5, 6],
  );
  const [editTimeOfDay, setEditTimeOfDay] = useState<HabitTimeOfDay | undefined>(timeOfDay);
  const [skipView, setSkipView] = useState<SkipView>("buttons");
  const [skipUntilDate, setSkipUntilDate] = useState<DateValue | null>(null);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setEditing(false);
        setSkipView("buttons");
        setSkipUntilDate(null);
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
      editPeriod === HabitPeriod.Day && editActiveDays.length < 7
        ? editActiveDays
        : undefined;
    await repos.habit.updateHabit(habitId, trimmed, n, editPeriod, days, editTimeOfDay);
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

  function toggleEditDay(day: number) {
    setEditActiveDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  async function handleSkip(type: "today" | "week" | "month") {
    if (!repos) return;
    await repos.habit.skipHabit(
      habitId,
      getSkipPeriodKeys(referenceDate, period, type),
    );
  }

  async function handleSkipUntil() {
    if (!repos || !skipUntilDate) return;
    const until = skipUntilDate.toDate(getLocalTimeZone());
    await repos.habit.skipHabit(
      habitId,
      getSkipPeriodKeys(referenceDate, period, "until", until),
    );
    setSkipView("buttons");
    setSkipUntilDate(null);
  }

  async function handleUnskip() {
    if (!repos) return;
    await repos.habit.unskipHabit(habitId, currentPeriodKey);
  }

  const { progress, complete } = habitProgress(value, times);
  const isEditValid = Boolean(editName.trim()) && Number(editTimes) > 0;

  const skipBtnClass =
    "cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-foreground/6 transition-colors";

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
                  {editPeriod === HabitPeriod.Day && (
                    <div className="mt-2">
                      <p className="text-xs text-foreground/50 mb-1">
                        Active days
                      </p>
                      <div className="flex gap-1">
                        {WEEKDAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleEditDay(i)}
                            className={[
                              "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-colors",
                              editActiveDays.includes(i)
                                ? "bg-purple-500 text-white"
                                : "bg-foreground/10 text-foreground/50 hover:bg-foreground/20",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2">
                    <p className="text-xs text-foreground/50 mb-1">Time of day</p>
                    <div className="flex gap-1 flex-wrap">
                      {(["morning", "afternoon", "evening"] as HabitTimeOfDay[]).map((tod) => (
                        <button
                          key={tod}
                          type="button"
                          onClick={() => setEditTimeOfDay((prev) => prev === tod ? undefined : tod)}
                          className={[
                            "cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                            editTimeOfDay === tod
                              ? "bg-purple-500 text-white"
                              : "bg-foreground/10 text-foreground/50 hover:bg-foreground/20",
                          ].join(" ")}
                        >
                          {tod.charAt(0).toUpperCase() + tod.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Modal.Heading>{name}</Modal.Heading>
              )}
            </Modal.Header>

            <Modal.Body className="p-1">
              {/* Progress + streak row */}
              {!editing && (
                <div className="mb-4 flex items-center gap-4">
                  <CircularCheckboxProgress
                    size={36}
                    stroke={5}
                    progress={progress}
                    complete={complete}
                    onClick={() =>
                      repos?.habitProgress.incrementHabit(
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
                          since{" "}
                          {formatPeriodKey(streak.openSincePeriodKey, period)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Skip section */}
              {!editing && (
                <Surface variant="default" className="mb-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Skip
                    </p>

                    {isCurrentPeriodSkipped ? (
                      /* Unskip */
                      <button onClick={handleUnskip} className={skipBtnClass}>
                        <CirclePlay
                          width={14}
                          height={14}
                          className="text-foreground/60"
                        />
                        Unskip this period
                      </button>
                    ) : skipView === "buttons" ? (
                      /* Skip options */
                      <>
                        <button
                          onClick={() => handleSkip("today")}
                          className={skipBtnClass}
                        >
                          <Clock
                            width={14}
                            height={14}
                            className="text-foreground/60"
                          />
                          Skip today
                        </button>
                        <button
                          onClick={() => handleSkip("week")}
                          className={skipBtnClass}
                        >
                          <CalendarIcon
                            width={14}
                            height={14}
                            className="text-foreground/60"
                          />
                          Skip this week
                        </button>
                        <button
                          onClick={() => handleSkip("month")}
                          className={skipBtnClass}
                        >
                          <CalendarIcon
                            width={14}
                            height={14}
                            className="text-foreground/60"
                          />
                          Skip this month
                        </button>
                        <button
                          onClick={() => setSkipView("calendar")}
                          className={skipBtnClass}
                        >
                          <ArrowRight
                            width={14}
                            height={14}
                            className="text-foreground/60"
                          />
                          Skip until…
                        </button>
                      </>
                    ) : (
                      /* Calendar picker */
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
                        <Calendar
                          value={skipUntilDate}
                          onChange={setSkipUntilDate}
                          aria-label="Pick skip-until date"
                        >
                          <Calendar.Header>
                            <Calendar.NavButton slot="previous" />
                            <Calendar.Heading />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => (
                                <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                              )}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                        </Calendar>
                        <Button
                          size="sm"
                          isDisabled={!skipUntilDate}
                          onPress={handleSkipUntil}
                        >
                          <Check />
                          Confirm
                        </Button>
                      </div>
                    )}
                  </div>
                </Surface>
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
