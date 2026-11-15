"use client";

import { useCallback, useState } from "react";
import { Button, Surface } from "@heroui/react";
import { TrashBin, Pencil } from "@gravity-ui/icons";
import { Task, Period, weekKeyOf } from "@weekly/domain";
import { DetailPanel } from "../ui";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useUndoableDelete } from "../../hooks/useUndoableDelete";
import { CommentSection } from "../comments/CommentSection";
import { SCOPE_OPTIONS } from "./ScopeSelector";
import { TaskEditFields, useTaskEditForm } from "./TaskEditForm";
import { PERIOD_COLORS } from "../general/PeriodBadge";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  /**
   * Open straight into the edit form — the row's `⋯` → Edit. Read once, as
   * initial state: `TaskItem` remounts the modal when the flag changes rather
   * than syncing a prop into state from an effect.
   */
  defaultEditing?: boolean;
}

/**
 * The legacy task detail (WS6 is moving this into `/app/tasks/:id`).
 *
 * WS12 changed two things here: **delete is reversible** rather than instant
 * and silent (DIRECTION §7 — see `useUndoableDelete` for what "undo" can and
 * cannot restore), and the footer's bare glyphs gained text labels, because a
 * delete button that is only a trash icon looks exactly as safe as the save
 * button beside it (DIRECTION §6.7).
 *
 * WS13 changed the shell. It was a `placement="center"` `size="sm"` `Modal`
 * with no mobile treatment at all — a 384px box floated in the middle of a
 * 375px phone, while the *note* modals had proper sheet styling. It now renders
 * through `DetailPanel`, so it is the same surface as `/app/tasks/:id`:
 * a right-side panel at `lg:`+ and a bottom sheet below it (DIRECTION §5).
 * The name stays `TaskDetailsModal` only until WS6 finishes retiring it.
 */
export function TaskDetailsModal({
  open,
  onOpenChange,
  task,
  defaultEditing = false,
}: TaskDetailsModalProps) {
  const { getTaskRepos, getTaskProjectId } = useRepositoryContext();
  const repos = getTaskRepos(task.id);
  const currentWorkspaceId = getTaskProjectId(task.id);

  const deleteWithUndo = useUndoableDelete();

  const [editing, setEditing] = useState(defaultEditing);

  // One form, shared with `/app/tasks/:id` — see `TaskEditForm`.
  const form = useTaskEditForm(task);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) setEditing(false);
      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  function handleDelete() {
    if (!repos) return;
    const snapshot = task;
    handleOpenChange(false);
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

  async function handleSave() {
    if (await form.save()) setEditing(false);
  }

  function startEditing() {
    form.reset();
    setEditing(true);
  }

  const scope = task.scope ?? Period.WEEK;

  // Derived label for the schedule date
  const scheduledDate = new Date(task.schedule ?? task.createdAt);
  const scheduleLabel =
    scope === Period.DAY
      ? scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
      : scope === Period.MONTH
        ? scheduledDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : `Week ${weekKeyOf(scheduledDate).split("-W")[1]}, ${scheduledDate.getFullYear()}`;

  const hasScheduleOverride = Boolean(task.schedule);

  /* A prop rather than children, so it stays pinned to the bottom of the
     panel in both presentations. */
  const footer = editing ? (
    <>
      <Button
        variant="ghost"
        className="min-h-11"
        onPress={() => setEditing(false)}
      >
        Cancel
      </Button>
      <Button
        className="min-h-11 bg-brand"
        isDisabled={!form.isValid || form.isSaving}
        onPress={handleSave}
      >
        Save
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" className="min-h-11" onPress={startEditing}>
        <Pencil />
        Edit
      </Button>
      <Button variant="danger" className="min-h-11" onPress={handleDelete}>
        <TrashBin />
        Delete task
      </Button>
    </>
  );

  return (
    <DetailPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={editing ? `Edit “${task.title}”` : task.title}
      ariaLabel={editing ? `Edit task ${task.title}` : `Task ${task.title}`}
      footer={footer}
    >
              {editing ? (
                <TaskEditFields form={form} onSubmit={handleSave} />
              ) : (
                <Surface variant="default">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-subtle">Scope</p>
                      <span
                        className={[
                          "w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                          PERIOD_COLORS[scope],
                        ].join(" ")}
                      >
                        {SCOPE_OPTIONS.find((o) => o.value === scope)?.label}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-subtle">Schedule</p>
                      <span className="text-sm text-foreground">
                        {scheduleLabel}
                        {hasScheduleOverride && (
                          <span className="ml-1.5 text-xs text-subtle">(rescheduled)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-subtle">
                        Created{" "}
                        {new Date(task.createdAt).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-subtle">
                        Status: {task.completed ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                </Surface>
              )}

              {!editing && (
                <div className="mt-3">
                  <CommentSection
                    target="task"
                    itemId={task.id}
                    itemName={task.title}
                    workspaceId={currentWorkspaceId}
                    isOpen={open}
                  />
                </div>
              )}
    </DetailPanel>
  );
}
