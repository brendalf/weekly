"use client";

import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Destructive-action parity, the reversible half (PLAN WS12 / DIRECTION §7).
 *
 * The app had it backwards: deleting a habit — which destroys every check-in
 * it ever recorded — was instant and silent, while deleting a *note* asked
 * twice. The rule is now "reversible **or** confirmed, never both silent and
 * instant":
 *
 * - **Habits** are confirmed, because their history cannot be rebuilt.
 *   See the `ConfirmButton` in `HabitDetailsModal` and the confirm dialog on
 *   the habit row.
 * - **Tasks and notes** are reversible — this hook. They delete immediately
 *   and the toast offers `Undo` for eight seconds.
 *
 * **What "undo" restores.** There is no soft-delete in the data model, so
 * `restore` re-creates the item from the snapshot the caller captured. The
 * content comes back; the document **id and timestamps do not** — anything
 * keyed to the old id (a task's comment thread) stays deleted. That is the
 * honest trade for not inventing a schema change inside a UI workstream
 * (DIRECTION §8); a real `deletedAt` tombstone is the follow-up.
 */

export interface UndoableDeleteOptions {
  /** Toast headline. Name what went: `"Task deleted"`. */
  message: string;
  /** Performs the delete. Rejecting surfaces `errorMessage` and skips the toast. */
  remove: () => Promise<void>;
  /** Re-creates the item. Rejecting surfaces `restoreErrorMessage`. */
  restore: () => Promise<void>;
  /** Shown when `remove` rejects. */
  errorMessage: string;
  /** Shown when `restore` rejects. @default "Could not undo. Please try again." */
  restoreErrorMessage?: string;
  /** Runs after a successful delete — close the panel, route away. */
  onDeleted?: () => void;
  /** How long `Undo` stays offered, in ms. @default 8000 */
  duration?: number;
}

/**
 * Returns a stable `deleteWithUndo(options)`.
 *
 * ```ts
 * const deleteWithUndo = useUndoableDelete();
 * deleteWithUndo({
 *   message: "Task deleted",
 *   remove: () => repos.task.deleteTask(task.id),
 *   restore: () => repos.task.addTask(task.title, task.scope).then(() => {}),
 *   errorMessage: "Failed to delete task. Please try again.",
 * });
 * ```
 */
export function useUndoableDelete() {
  return useCallback(
    ({
      message,
      remove,
      restore,
      errorMessage,
      restoreErrorMessage = "Could not undo. Please try again.",
      onDeleted,
      duration = 8000,
    }: UndoableDeleteOptions) => {
      remove()
        .then(() => {
          onDeleted?.();
          toast.success(message, {
            duration,
            action: {
              label: "Undo",
              onClick: () => {
                restore().catch(() => toast.error(restoreErrorMessage));
              },
            },
          });
        })
        .catch(() => {
          toast.error(errorMessage);
        });
    },
    [],
  );
}
