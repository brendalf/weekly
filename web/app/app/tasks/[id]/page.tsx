"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import { Period, weekKeyOf } from "@weekly/domain";
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
 * **TODO (WS6):** move `TaskDetailsModal`'s body in here — the edit form, the
 * workspace move, the comment thread — swapping its raw `<select>` and
 * `<input type="date">` for HeroUI `Select` and `DatePicker` (DIRECTION §6.6),
 * and add the one-click "move to this week" an overdue task needs. Then delete
 * the modal and `TaskItem`'s fallback branch.
 */
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tasks, workspaces, workspacesLoaded, toggleTaskCompleted } =
    useAppData();
  const { getTaskRepos, getTaskProjectId } = useRepositoryContext();

  const task = tasks.find((t) => t.id === id) ?? null;
  const workspaceName = workspaces.find(
    (w) => w.id === getTaskProjectId(id),
  )?.name;
  const scope = task?.scope ?? Period.WEEK;

  function close() {
    router.push("/app/tasks");
  }

  async function handleDelete() {
    const repos = getTaskRepos(id);
    if (!repos) return;
    try {
      await repos.task.deleteTask(id);
    } catch {
      toast.error("Failed to delete task. Please try again.");
      return;
    }
    close();
  }

  return (
    <DetailPanel
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={task?.title ?? "Task"}
      ariaLabel="Task details"
      footer={
        task && (
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
      {task ? (
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
      ) : workspacesLoaded ? (
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
