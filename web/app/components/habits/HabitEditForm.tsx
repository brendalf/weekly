"use client";

import { useCallback, useState } from "react";
import { Input, TextField } from "@heroui/react";
import { toast } from "sonner";
import { Period, type HabitTimeOfDay } from "@weekly/domain";
import { FormField, FormFields } from "../general/DetailField";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { ActiveDaysSelector } from "./ActiveDaysSelector";
import { HabitPeriodSelect } from "./HabitPeriodSelect";
import { TimeOfDaySelector } from "./TimeOfDaySelector";

/**
 * The one habit edit form (PLAN WS5).
 *
 * There are two places a habit is edited — the legacy `HabitDetailsModal` that
 * `/app/week` still uses, and the `/app/habits/:id` detail panel — and the
 * panel shipped with no edit mode at all, so the row's `⋯ → Edit` opened a
 * read-only page. Rather than write the form a second time, the draft state and
 * the save live in {@link useHabitEditForm} and the controls live in
 * {@link HabitEditFields}; both surfaces render the same thing and only decide
 * where the Cancel/Save buttons go.
 *
 * The state is seeded **once**, from props read as initial values. Callers that
 * can change habit while the form is open remount it (`key`) instead of syncing
 * props into state from an effect.
 */

/** Everything the form needs about the habit it is editing. */
export interface HabitEditSubject {
  id: string;
  name: string;
  times: number;
  period: Period;
  activeDays?: number[];
  timeOfDay?: HabitTimeOfDay;
}

/** All seven days, the implied default when `activeDays` is absent. */
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export interface HabitEditForm {
  name: string;
  setName: (value: string) => void;
  /** Kept as a string so a half-typed number does not snap back to 1. */
  times: string;
  setTimes: (value: string) => void;
  period: Period;
  setPeriod: (value: Period) => void;
  activeDays: number[];
  setActiveDays: (value: number[]) => void;
  timeOfDay: HabitTimeOfDay | undefined;
  setTimeOfDay: (value: HabitTimeOfDay | undefined) => void;
  /** False while the name is blank or the target is not a positive number. */
  isValid: boolean;
  /** True while a save is in flight. */
  isSaving: boolean;
  /** Writes the habit. Resolves `true` on success, `false` if it was rejected. */
  save: () => Promise<boolean>;
  /**
   * Re-seeds the draft from the habit as it stands now. Call it when *entering*
   * edit mode: the surface may have been open — and the habit may have changed
   * under it — since the draft was first seeded.
   */
  reset: () => void;
}

export function useHabitEditForm(habit: HabitEditSubject): HabitEditForm {
  const { getHabitRepos } = useRepositoryContext();

  const [name, setName] = useState(habit.name);
  const [times, setTimes] = useState(String(habit.times));
  const [period, setPeriod] = useState<Period>(habit.period);
  const [activeDays, setActiveDays] = useState<number[]>(
    habit.activeDays && habit.activeDays.length > 0
      ? habit.activeDays
      : EVERY_DAY,
  );
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay | undefined>(
    habit.timeOfDay,
  );
  const [isSaving, setIsSaving] = useState(false);

  const trimmedName = name.trim();
  const target = Number(times);
  const isValid = Boolean(trimmedName) && Number.isFinite(target) && target > 0;

  const save = useCallback(async () => {
    const repos = getHabitRepos(habit.id);
    if (!repos || !isValid) return false;
    // Seven active days is "every day", which the model stores as absent —
    // otherwise a daily habit carries a redundant list forever.
    const days =
      period === Period.DAY && activeDays.length < 7 ? activeDays : undefined;

    setIsSaving(true);
    try {
      await repos.habit.updateHabit(
        habit.id,
        trimmedName,
        target,
        period,
        days,
        timeOfDay,
      );
      return true;
    } catch {
      toast.error("Failed to save habit. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    getHabitRepos,
    habit.id,
    isValid,
    trimmedName,
    target,
    period,
    activeDays,
    timeOfDay,
  ]);

  const reset = useCallback(() => {
    setName(habit.name);
    setTimes(String(habit.times));
    setPeriod(habit.period);
    setActiveDays(
      habit.activeDays && habit.activeDays.length > 0
        ? habit.activeDays
        : EVERY_DAY,
    );
    setTimeOfDay(habit.timeOfDay);
  }, [
    habit.name,
    habit.times,
    habit.period,
    habit.activeDays,
    habit.timeOfDay,
  ]);

  return {
    name,
    setName,
    times,
    setTimes,
    period,
    setPeriod,
    activeDays,
    setActiveDays,
    timeOfDay,
    setTimeOfDay,
    isValid,
    isSaving,
    save,
    reset,
  };
}

export interface HabitEditFieldsProps {
  form: HabitEditForm;
  /** Fired by `Enter` in the name field, so the keyboard can finish the form. */
  onSubmit?: () => void;
}

export function HabitEditFields({ form, onSubmit }: HabitEditFieldsProps) {
  return (
    <FormFields>
      <FormField label="Name">
        <TextField name="habitName" className="w-full">
          <Input
            aria-label="Habit name"
            value={form.name}
            variant="secondary"
            autoFocus
            className="text-base"
            onChange={(e) => form.setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && form.isValid) onSubmit?.();
            }}
          />
        </TextField>
      </FormField>

      <FormField label="Repeats">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Times per period"
            type="number"
            min={1}
            inputMode="numeric"
            value={form.times}
            className="max-w-20 text-base"
            variant="secondary"
            onChange={(e) => form.setTimes(e.target.value)}
          />
          <HabitPeriodSelect value={form.period} onChange={form.setPeriod} />
        </div>
      </FormField>

      {/* Active days only mean something for a daily habit — a weekly one is
          measured over the whole week, whichever days it lands on. */}
      {form.period === Period.DAY && (
        <FormField
          label="Active days"
          hint={
            form.activeDays.length === 7
              ? "Every day counts towards the streak."
              : "Days left out never count as missed."
          }
        >
          <ActiveDaysSelector
            activeDays={form.activeDays}
            onChange={form.setActiveDays}
          />
        </FormField>
      )}

      <FormField label="Time of day">
        <TimeOfDaySelector
          value={form.timeOfDay}
          onChange={form.setTimeOfDay}
        />
      </FormField>
    </FormFields>
  );
}
