"use client";

import { useCallback, useState } from "react";
import { Input, TextField } from "@heroui/react";
import { toast } from "sonner";
import { Period, type Task } from "@weekly/domain";
import { FormField, FormFields } from "../general/DetailField";
import { DatePickerField } from "../general/DatePickerField";
import { OptionSelect } from "../general/OptionSelect";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useWorkspaceStore } from "../../stores/workspace";
import { ScopeSelector } from "./ScopeSelector";

/**
 * The one task edit form (PLAN WS6).
 *
 * Same split as `HabitEditForm`, for the same reason: `TaskDetailsModal` (still
 * used by `/app/week`) and the `/app/tasks/:id` panel both need it, and the
 * panel shipped read-only so `⋯ → Edit` led nowhere. Draft state and the write
 * live in {@link useTaskEditForm}; the controls live in
 * {@link TaskEditFields}.
 *
 * This is also where DIRECTION §6.6 gets settled for tasks. The form used a raw
 * `<select>` for the workspace and a raw `<input type="date">` for the
 * schedule, both sitting beside a HeroUI `Select` in the same modal. They are
 * now `OptionSelect` and `DatePickerField`.
 */

/** The schedule a task falls under when it has no override of its own. */
function defaultScheduleOf(task: Task): string {
  return (task.schedule ?? task.createdAt).slice(0, 10);
}

export interface TaskEditForm {
  title: string;
  setTitle: (value: string) => void;
  scope: Period;
  setScope: (value: Period) => void;
  /** `YYYY-MM-DD`, or `null` once the user clears the date. */
  schedule: string | null;
  setSchedule: (value: string | null) => void;
  /** Workspace the task should end up in. */
  workspaceId: string | null;
  setWorkspaceId: (value: string | null) => void;
  /** Workspaces the task can be moved to; empty when there is only one. */
  workspaceOptions: { id: string; label: string }[];
  isValid: boolean;
  isSaving: boolean;
  /** Writes the task. Resolves `true` on success, `false` if it was rejected. */
  save: () => Promise<boolean>;
  /** Re-seeds the draft from the task as it stands now. Call on entering edit mode. */
  reset: () => void;
}

export function useTaskEditForm(task: Task): TaskEditForm {
  const { getTaskRepos, getWorkspaceRepos, getTaskProjectId } =
    useRepositoryContext();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspaceId = getTaskProjectId(task.id);
  const defaultSchedule = defaultScheduleOf(task);

  const [title, setTitle] = useState(task.title);
  const [scope, setScope] = useState<Period>(task.scope ?? Period.WEEK);
  const [schedule, setSchedule] = useState<string | null>(defaultSchedule);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    currentWorkspaceId,
  );
  const [isSaving, setIsSaving] = useState(false);

  const trimmedTitle = title.trim();
  const isValid = Boolean(trimmedTitle);

  const save = useCallback(async () => {
    const repos = getTaskRepos(task.id);
    if (!repos || !isValid) return false;

    const targetWorkspaceId = workspaceId ?? currentWorkspaceId;
    const movingWorkspace = Boolean(
      targetWorkspaceId && targetWorkspaceId !== currentWorkspaceId,
    );
    // An untouched date must stay untouched: writing it back would turn a task
    // that merely inherits its creation date into one with an explicit
    // override, and `taskPeriodKey` reads the override first.
    const scheduleChanged = schedule !== defaultSchedule;
    // Parsed at noon so a date that crosses a DST boundary keeps its own day.
    const scheduleDate = schedule ? new Date(`${schedule}T12:00:00`) : null;

    setIsSaving(true);
    try {
      if (movingWorkspace && targetWorkspaceId) {
        // Tasks live under a workspace, so a move is a create plus a delete.
        // The copy starts open — a task you just moved is work you still owe.
        const targetRepos = getWorkspaceRepos(targetWorkspaceId);
        if (!targetRepos) return false;
        const newId = await targetRepos.task.addTask(
          trimmedTitle,
          scope,
          new Date(task.createdAt),
        );
        if (scheduleChanged) {
          await targetRepos.task.updateTask(newId, {
            schedule: scheduleDate,
          });
        }
        await repos.task.deleteTask(task.id);
      } else {
        await repos.task.updateTask(task.id, {
          title: trimmedTitle,
          scope,
          schedule: scheduleChanged ? scheduleDate : undefined,
        });
      }
      return true;
    } catch {
      toast.error("Failed to save task. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    getTaskRepos,
    getWorkspaceRepos,
    task.id,
    task.createdAt,
    isValid,
    trimmedTitle,
    scope,
    schedule,
    defaultSchedule,
    workspaceId,
    currentWorkspaceId,
  ]);

  const reset = useCallback(() => {
    setTitle(task.title);
    setScope(task.scope ?? Period.WEEK);
    setSchedule(defaultScheduleOf(task));
    setWorkspaceId(currentWorkspaceId);
  }, [task, currentWorkspaceId]);

  return {
    title,
    setTitle,
    scope,
    setScope,
    schedule,
    setSchedule,
    workspaceId,
    setWorkspaceId,
    workspaceOptions:
      workspaces.length > 1
        ? workspaces.map((w) => ({ id: w.id, label: w.name }))
        : [],
    isValid,
    isSaving,
    save,
    reset,
  };
}

export interface TaskEditFieldsProps {
  form: TaskEditForm;
  /** Fired by `Enter` in the title field. */
  onSubmit?: () => void;
}

export function TaskEditFields({ form, onSubmit }: TaskEditFieldsProps) {
  return (
    <FormFields>
      <FormField label="Title">
        <TextField name="taskTitle" className="w-full">
          <Input
            aria-label="Task title"
            value={form.title}
            variant="secondary"
            autoFocus
            className="text-base"
            onChange={(e) => form.setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && form.isValid) onSubmit?.();
            }}
          />
        </TextField>
      </FormField>

      <FormField
        label="Scope"
        hint="How long the task has: a day, a week, or a month."
      >
        <ScopeSelector value={form.scope} onChange={form.setScope} />
      </FormField>

      <FormField label="Scheduled">
        <DatePickerField
          label="Scheduled date"
          value={form.schedule}
          onChange={form.setSchedule}
        />
      </FormField>

      {form.workspaceOptions.length > 0 && (
        <FormField label="Workspace">
          <OptionSelect
            ariaLabel="Workspace"
            value={form.workspaceId ?? ""}
            options={form.workspaceOptions}
            onChange={form.setWorkspaceId}
          />
        </FormField>
      )}
    </FormFields>
  );
}
