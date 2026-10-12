"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Surface,
  useOverlayState,
  Input,
  TextField,
} from "@heroui/react";
import { TrashBin, Pencil } from "@gravity-ui/icons";
import { Task, Period, weekKeyOf } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useUndoableDelete } from "../../hooks/useUndoableDelete";
import { useWorkspaceStore } from "../../stores/workspace";
import { CommentSection } from "../comments/CommentSection";
import { ScopeSelector, SCOPE_OPTIONS } from "./ScopeSelector";
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
 */
export function TaskDetailsModal({
  open,
  onOpenChange,
  task,
  defaultEditing = false,
}: TaskDetailsModalProps) {
  const { getTaskRepos, getWorkspaceRepos, getTaskProjectId } = useRepositoryContext();
  const repos = getTaskRepos(task.id);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspaceId = getTaskProjectId(task.id);

  const defaultSchedule = (task.schedule ?? task.createdAt).slice(0, 10);

  const deleteWithUndo = useUndoableDelete();

  const [editing, setEditing] = useState(defaultEditing);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editScope, setEditScope] = useState<Period>(task.scope ?? Period.WEEK);
  const [editSchedule, setEditSchedule] = useState(defaultSchedule);
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) setEditing(false);
      onOpenChange(isOpen);
    },
  });

  function handleDelete() {
    if (!repos) return;
    const snapshot = task;
    state.close();
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
    if (!repos) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    const targetWsId = editWorkspaceId ?? currentWorkspaceId;
    const wsChanged = targetWsId && targetWsId !== currentWorkspaceId;
    const scheduleUnchanged = editSchedule === defaultSchedule;
    // Parse date string as local time to avoid UTC timezone offset issues
    const scheduleDate = editSchedule
      ? new Date(`${editSchedule}T12:00:00`)
      : null;

    if (wsChanged && targetWsId) {
      // Workspace move: create in target workspace, delete from current
      const targetRepos = getWorkspaceRepos(targetWsId);
      if (!targetRepos) return;
      // Note: moved task starts as incomplete
      const newId = await targetRepos.task.addTask(trimmed, editScope, new Date(task.createdAt));
      if (!scheduleUnchanged && scheduleDate) {
        await targetRepos.task.updateTask(newId, { schedule: scheduleDate });
      }
      await repos.task.deleteTask(task.id);
    } else {
      await repos.task.updateTask(task.id, {
        title: trimmed,
        scope: editScope,
        schedule: scheduleUnchanged ? undefined : (scheduleDate ?? null),
      });
    }
    setEditing(false);
  }

  function startEditing() {
    setEditTitle(task.title);
    setEditScope(task.scope ?? Period.WEEK);
    setEditSchedule(defaultSchedule);
    setEditWorkspaceId(null);
    setEditing(true);
  }

  const isEditValid = Boolean(editTitle.trim());
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

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              {editing ? (
                <div className="w-full pr-8">
                  <TextField name="editTitle">
                    <Input
                      value={editTitle}
                      variant="secondary"
                      autoFocus
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                      }}
                    />
                  </TextField>
                </div>
              ) : (
                <Modal.Heading>{task.title}</Modal.Heading>
              )}
            </Modal.Header>

            <Modal.Body className="p-1">
              <Surface variant="default">
                <div className="flex flex-col gap-3">
                  {/* Scope */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-subtle">Scope</p>
                    {editing ? (
                      <ScopeSelector value={editScope} onChange={setEditScope} />
                    ) : (
                      <span
                        className={[
                          "w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                          PERIOD_COLORS[scope],
                        ].join(" ")}
                      >
                        {SCOPE_OPTIONS.find((o) => o.value === scope)?.label}
                      </span>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-subtle">Schedule</p>
                    {editing ? (
                      <input
                        type="date"
                        value={editSchedule}
                        onChange={(e) => setEditSchedule(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-base text-foreground focus:outline-none focus:border-border-strong"
                      />
                    ) : (
                      <span className="text-sm text-foreground">
                        {scheduleLabel}
                        {hasScheduleOverride && (
                          <span className="ml-1.5 text-xs text-subtle">(rescheduled)</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Workspace selector — only in edit mode with multiple workspaces */}
                  {editing && workspaces.length > 1 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-subtle">Workspace</p>
                      <select
                        value={editWorkspaceId ?? currentWorkspaceId ?? ""}
                        onChange={(e) => setEditWorkspaceId(e.target.value || null)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-base text-foreground focus:outline-none focus:border-border-strong"
                      >
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>
                            {ws.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Meta */}
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
                    className="min-h-11 bg-brand"
                    isDisabled={!isEditValid}
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
                  <Button
                    variant="danger"
                    className="min-h-11"
                    onPress={handleDelete}
                  >
                    <TrashBin />
                    Delete task
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
