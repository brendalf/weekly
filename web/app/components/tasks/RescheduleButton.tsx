"use client";

import { Period, taskRescheduleTargets, type Task } from "@weekly/domain";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import { ActionMenu } from "../ui";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

interface RescheduleButtonProps {
  task: Task;
}

/**
 * The one-click reschedule an overdue task leads with (DIRECTION §7).
 *
 * An overdue task used to show only an "open since W41" badge and offer
 * nothing to do about it. The first target for the task's scope is the current
 * period, so the common case — "bring this into this week" — is a single press;
 * the rest sit behind the caret.
 *
 * Writes `Task.schedule`, the override the model already carries, so there is
 * no schema change (DIRECTION §8). `TaskActionMenu` offers the same targets
 * from the same domain helper, so the panel and the row menu can never drift.
 */
export function RescheduleButton({ task }: RescheduleButtonProps) {
  const { getTaskRepos } = useRepositoryContext();
  const repos = getTaskRepos(task.id);

  const scope = task.scope ?? Period.WEEK;
  const targets = taskRescheduleTargets(scope, new Date());
  const [primary, ...rest] = targets;

  function reschedule(date: Date) {
    if (!repos) return;
    repos.task
      .updateTask(task.id, { schedule: date })
      .catch(() => toast.error("Failed to move task. Please try again."));
  }

  if (!repos || !primary) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        className="min-h-11"
        onPress={() => reschedule(primary.date)}
      >
        Move to {primary.label.toLowerCase()}
      </Button>

      {rest.length > 0 && (
        <ActionMenu
          label="Other reschedule options"
          placement="bottom end"
          items={rest.map((target) => ({
            key: target.label,
            label: target.label,
            onAction: () => reschedule(target.date),
          }))}
        />
      )}
    </div>
  );
}
