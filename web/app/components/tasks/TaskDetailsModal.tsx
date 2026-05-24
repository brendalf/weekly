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
import { TrashBin, Pencil, Xmark, Check } from "@gravity-ui/icons";
import { Task, Period, weekKeyOf } from "@weekly/domain";
import { toast } from "sonner";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useWorkspaceStore } from "../../stores/workspace";
import { ScopeSelector, SCOPE_OPTIONS } from "./ScopeSelector";
import { PERIOD_COLORS } from "../general/PeriodBadge";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

export function TaskDetailsModal({
  open,
  onOpenChange,
  task,
}: TaskDetailsModalProps) {
  const { getTaskRepos, getWorkspaceRepos, getTaskProjectId } = useRepositoryContext();
  const repos = getTaskRepos(task.id);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspaceId = getTaskProjectId(task.id);

  const defaultSchedule = (task.schedule ?? task.createdAt).slice(0, 10);

  const [editing, setEditing] = useState(false);
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
    state.close();
    repos.task.deleteTask(task.id).catch(() => {
      toast.error("Failed to delete task. Please try again.");
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
                    <p className="text-xs text-foreground/50">Scope</p>
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
                    <p className="text-xs text-foreground/50">Schedule</p>
                    {editing ? (
                      <input
                        type="date"
                        value={editSchedule}
                        onChange={(e) => setEditSchedule(e.target.value)}
                        className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-foreground/30"
                      />
                    ) : (
                      <span className="text-sm text-foreground">
                        {scheduleLabel}
                        {hasScheduleOverride && (
                          <span className="ml-1.5 text-xs text-foreground/40">(rescheduled)</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Workspace selector — only in edit mode with multiple workspaces */}
                  {editing && workspaces.length > 1 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-foreground/50">Workspace</p>
                      <select
                        value={editWorkspaceId ?? currentWorkspaceId ?? ""}
                        onChange={(e) => setEditWorkspaceId(e.target.value || null)}
                        className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-foreground/30"
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
                    <p className="text-xs text-foreground/50">
                      Created{" "}
                      {new Date(task.createdAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-foreground/50">
                      Status: {task.completed ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              </Surface>
            </Modal.Body>

            <Modal.Footer>
              {editing ? (
                <>
                  <Button variant="ghost" onPress={() => setEditing(false)}>
                    <Xmark />
                  </Button>
                  <Button
                    className="bg-purple-500"
                    isDisabled={!isEditValid}
                    onPress={handleSave}
                  >
                    <Check />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onPress={startEditing}>
                    <Pencil />
                  </Button>
                  <Button variant="danger" onPress={handleDelete}>
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
