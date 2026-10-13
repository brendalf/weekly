"use client";

import {
  Period,
  selectedPeriodKey,
  taskPeriodKey,
  taskRescheduleTargets,
  type Task,
} from "@weekly/domain";
import {
  ArrowShapeRight,
  Calendar,
  Copy,
  Pencil,
  TrashBin,
} from "@gravity-ui/icons";
import { toast } from "sonner";
import { ActionMenu } from "../ui";
import type { ActionMenuEntry } from "../ui";
import { rowControl } from "../../hooks/useRowKeys";
import { useUndoableDelete } from "../../hooks/useUndoableDelete";
import { useActivityLog } from "../../hooks/useActivityLog";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

/**
 * The task row's `⋯` (PLAN WS10 / DIRECTION §7).
 *
 * Tasks had **no row menu at all**: editing a title, changing a scope,
 * rescheduling, or deleting meant opening the detail view first — four
 * interactions for the product's most frequent object. Every one of those is
 * now one press from the row.
 *
 * Three notes on behavior:
 *
 * - **Reschedule writes `Task.schedule`**, the override field the model
 *   already has (`{ id, title, createdAt, completed, scope?, schedule? }`).
 *   No schema change (DIRECTION §8), and `taskPeriodKey` already prefers
 *   `schedule` over `createdAt`, so the row simply moves.
 * - **The targets follow the task's own scope.** "Next week" on a month-scoped
 *   task would be meaningless, so a month task is offered months and a day
 *   task is offered days. The *first* entry is the current period, which is
 *   the one-click "move to this week" an overdue row needs (DIRECTION §7) —
 *   it is only offered when the task is actually late.
 * - **Delete is reversible, not confirmed.** A task is a title, a scope and a
 *   date; losing one to a mis-tap is cheap to undo and expensive to confirm
 *   every time. Habits are the other way round.
 */

export interface TaskActionMenuProps {
  task: Task;
  /** Opens the task's detail view in edit mode. */
  onEdit: () => void;
}

/**
 * Scope names for the "Change scope" submenu. Deliberately *not*
 * `SCOPE_OPTIONS` from `ScopeSelector`, whose labels ("Today", "This week")
 * are the reschedule vocabulary and would read as a date in a menu that also
 * has a "Move to" submenu.
 */
const SCOPE_LABELS: { value: Period; label: string }[] = [
  { value: Period.DAY, label: "Day" },
  { value: Period.WEEK, label: "Week" },
  { value: Period.MONTH, label: "Month" },
];

export function TaskActionMenu({ task, onEdit }: TaskActionMenuProps) {
  const { getTaskRepos, getTaskProjectId } = useRepositoryContext();
  const repos = getTaskRepos(task.id);
  const deleteWithUndo = useUndoableDelete();
  const logActivity = useActivityLog();

  const scope = task.scope ?? Period.WEEK;
  const today = new Date();
  const isOverdue =
    !task.completed && taskPeriodKey(task) < selectedPeriodKey(scope, today);

  function reschedule(date: Date) {
    if (!repos) return;
    repos.task
      .updateTask(task.id, { schedule: date })
      .catch(() => toast.error("Failed to move task. Please try again."));
  }

  function changeScope(next: Period) {
    if (!repos) return;
    repos.task
      .updateTask(task.id, { scope: next })
      .catch(() => toast.error("Failed to change scope. Please try again."));
  }

  function duplicate() {
    if (!repos) return;
    repos.task
      .addTask(task.title, scope, new Date(task.createdAt))
      .then(async (newId) => {
        if (task.schedule) {
          await repos.task.updateTask(newId, {
            schedule: new Date(task.schedule),
          });
        }
        logActivity(getTaskProjectId(task.id), {
          type: "task_added",
          itemId: newId,
          itemName: task.title,
        });
        toast.success("Task duplicated");
      })
      .catch(() => toast.error("Failed to duplicate task. Please try again."));
  }

  function remove() {
    if (!repos) return;
    const snapshot = task;
    deleteWithUndo({
      message: "Task deleted",
      errorMessage: "Failed to delete task. Please try again.",
      remove: () => repos.task.deleteTask(snapshot.id),
      restore: async () => {
        const newId = await repos.task.addTask(
          snapshot.title,
          snapshot.scope,
          new Date(snapshot.createdAt),
        );
        if (snapshot.schedule) {
          await repos.task.updateTask(newId, {
            schedule: new Date(snapshot.schedule),
          });
        }
        if (snapshot.completed) {
          await repos.task.toggleTask({ ...snapshot, id: newId });
        }
      },
    });
  }

  const targets = taskRescheduleTargets(scope, today);

  const items: ActionMenuEntry[] = [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil width={16} height={16} />,
      onAction: onEdit,
    },
    {
      key: "scope",
      label: "Change scope",
      icon: <Calendar width={16} height={16} />,
      items: SCOPE_LABELS.map((option) => ({
        key: `scope-${option.value}`,
        label: option.label,
        disabled: option.value === scope,
        onAction: () => changeScope(option.value),
      })),
    },
    {
      key: "move",
      label: "Move to",
      icon: <ArrowShapeRight width={16} height={16} />,
      items: targets
        // The current period is only a *move* for a task that has fallen out of it.
        .filter((_, index) => index > 0 || isOverdue)
        .map(({ label, date }) => ({
          key: `move-${label}`,
          label,
          onAction: () => reschedule(date),
        })),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy width={16} height={16} />,
      onAction: duplicate,
    },
    { kind: "separator", key: "sep" },
    {
      key: "delete",
      label: "Delete",
      icon: <TrashBin width={16} height={16} />,
      danger: true,
      onAction: remove,
    },
  ];

  return (
    <ActionMenu
      label={`Actions for ${task.title}`}
      items={items}
      triggerClassName={rowControl}
      popoverClassName="w-52"
    />
  );
}
