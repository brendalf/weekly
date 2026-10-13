"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import { Pencil } from "@gravity-ui/icons";
import { Period, taskBucket, type Task, weekKeyOf } from "@weekly/domain";
import {
  ConfirmButton,
  DetailPanel,
  EmptyState,
  SkeletonList,
} from "../../../components/ui";
import {
  DetailField,
  DetailFields,
} from "../../../components/general/DetailField";
import { CommentSection } from "../../../components/comments/CommentSection";
import {
  TaskEditFields,
  useTaskEditForm,
} from "../../../components/tasks/TaskEditForm";
import { RescheduleButton } from "../../../components/tasks/RescheduleButton";
import { useAppData } from "../../../components/shell/AppDataProvider";
import { useRepositoryContext } from "../../../contexts/RepositoryContext";

/** How a task's scheduled period reads, in the task's own scope. */
function formatSchedule(iso: string, scope: Period): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  if (scope === Period.DAY) {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  if (scope === Period.MONTH) {
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }
  return `Week ${weekKeyOf(date).split("-W")[1]}, ${date.getFullYear()}`;
}

/**
 * `/app/tasks/:id` — one task in the shared `DetailPanel`. Same pattern as
 * `/app/habits/:id`.
 *
 * WS6 gave it an **edit mode** (the panel shipped view-only, so `⋯ → Edit`
 * routed here and offered nothing to edit) using `TaskEditForm`, shared with
 * the `TaskDetailsModal` that `/app/week` still uses. That is also where the
 * raw `<select>` and `<input type="date">` became a HeroUI `Select` and
 * `DatePicker` (DIRECTION §6.6).
 *
 * An overdue task leads with its reschedule, here as in the list: a panel that
 * states a task is three weeks late and offers no way to move it is the gap
 * DIRECTION §7 calls out.
 */
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tasks, workspacesLoaded } = useAppData();

  const task = tasks.find((t) => t.id === id) ?? null;

  function close() {
    router.push("/app/tasks");
  }

  if (task) {
    return <TaskPanel key={task.id} task={task} onClose={close} />;
  }

  return (
    <DetailPanel
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="Task"
      ariaLabel="Task details"
    >
      {workspacesLoaded ? (
        <EmptyState
          headline="This task is gone"
          body="It was deleted, or it lives in a workspace that is not in view."
          action={
            <Button variant="outline" className="min-h-11" onPress={close}>
              Back to tasks
            </Button>
          }
        />
      ) : (
        <SkeletonList count={3} label="Loading task" />
      )}
    </DetailPanel>
  );
}

function TaskPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const { workspaces, toggleTaskCompleted } = useAppData();
  const { getTaskRepos, getTaskProjectId } = useRepositoryContext();
  const [editing, setEditing] = useState(false);
  const form = useTaskEditForm(task);

  const workspaceId = getTaskProjectId(task.id);
  const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name;
  const scope = task.scope ?? Period.WEEK;
  const isOverdue = taskBucket(task, new Date()) === "overdue";

  async function handleDelete() {
    const repos = getTaskRepos(task.id);
    if (!repos) return;
    try {
      await repos.task.deleteTask(task.id);
    } catch {
      toast.error("Failed to delete task. Please try again.");
      return;
    }
    onClose();
  }

  async function handleSave() {
    if (await form.save()) setEditing(false);
  }

  return (
    <DetailPanel
      open
      onOpenChange={(open) => {
        if (open) return;
        if (editing) setEditing(false);
        else onClose();
      }}
      title={editing ? `Edit “${task.title}”` : task.title}
      ariaLabel="Task details"
      footer={
        editing ? (
          <>
            <Button
              variant="ghost"
              className="min-h-11"
              onPress={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              isDisabled={!form.isValid || form.isSaving}
              onPress={handleSave}
            >
              Save
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              className="mr-auto min-h-11"
              onPress={() => {
                toggleTaskCompleted(task.id).catch(() => {
                  toast.error("Failed to update task. Please try again.");
                });
              }}
            >
              {task.completed ? "Mark as open" : "Mark as done"}
            </Button>
            <Button
              variant="ghost"
              className="min-h-11"
              onPress={() => {
                form.reset();
                setEditing(true);
              }}
            >
              <Pencil width={16} height={16} />
              Edit
            </Button>
            <ConfirmButton
              label="Delete task"
              confirmLabel="Delete task"
              variant="ghost"
              onConfirm={handleDelete}
            />
          </>
        )
      }
    >
      {editing ? (
        <TaskEditFields form={form} onSubmit={handleSave} />
      ) : (
        <div className="flex flex-col gap-5">
          {isOverdue && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2.5">
              <p className="min-w-0 flex-1 text-sm text-warning-muted">
                Still open from{" "}
                {formatSchedule(task.schedule ?? task.createdAt, scope)}.
              </p>
              <RescheduleButton task={task} />
            </div>
          )}

          <DetailFields>
            <DetailField label="Status">
              {task.completed ? "Completed" : "Open"}
            </DetailField>
            <DetailField label="Scope">{scope}</DetailField>
            <DetailField label="Scheduled">
              {formatSchedule(task.schedule ?? task.createdAt, scope)}
              {task.schedule && (
                <span className="ml-1.5 text-xs text-subtle">(rescheduled)</span>
              )}
            </DetailField>
            {workspaceName && (
              <DetailField label="Workspace">{workspaceName}</DetailField>
            )}
            <DetailField label="Added">
              {new Date(task.createdAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </DetailField>
          </DetailFields>

          <CommentSection
            target="task"
            itemId={task.id}
            itemName={task.title}
            workspaceId={workspaceId}
            isOpen
          />
        </div>
      )}
    </DetailPanel>
  );
}
