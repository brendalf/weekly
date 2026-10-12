"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Task } from "@weekly/domain";
import { toast } from "sonner";
import { CircularCheckboxProgress } from "../general/CircularCheckboxProgress";
import { Badge } from "../general/Badge";
import { PeriodBadge } from "../general/PeriodBadge";
import { TaskActionMenu } from "./TaskActionMenu";
import { TaskDetailsModal } from "./TaskDetailsModal";
import {
  ROW_ATTR,
  rowControl,
  rowLink,
  rowShell,
  useRowKeys,
} from "../../hooks/useRowKeys";

interface TaskItemProps {
  task: Task;
  onToggleCompleted: (taskId: string) => Promise<void>;
  projectName?: string;
  openSinceLabel?: string;
  showScopeLabel?: boolean;
  /**
   * Route for this task's detail panel (`/app/tasks/:id`). When set the row
   * title is a real link and the legacy `TaskDetailsModal` is not rendered —
   * the panel route owns the detail (DIRECTION §5).
   */
  detailHref?: string;
}

/**
 * A task row (PLAN WS10 + WS12).
 *
 * It used to be a `<div onClick>` wrapping a `<div onClick stopPropagation>`:
 * not focusable, not `Enter`-activatable, invisible to a screen reader, and
 * with no row actions whatsoever (DIRECTION §6.8, §7).
 *
 * It is now the shared row shell — see `hooks/useRowKeys` for why a row that
 * contains a progress ring and a `⋯` menu cannot simply be a `<button>`, and
 * how the stretched-link pattern gets focusability without nesting one.
 * `Tab` reaches it, `Enter` opens it, `x`/`Space` toggle it, `j`/`k` walk
 * between rows, and the `⋯` carries the five actions that used to require
 * opening the detail view.
 */
export function TaskItem({
  task,
  onToggleCompleted,
  projectName,
  openSinceLabel,
  showScopeLabel = true,
  detailHref,
}: TaskItemProps) {
  const router = useRouter();
  const [detail, setDetail] = useState({ open: false, editing: false });
  const [optimisticCompleted, setOptimisticCompleted] = useState<
    boolean | null
  >(null);
  const scope = task.scope ?? "week";

  const displayCompleted = optimisticCompleted ?? task.completed;

  function handleToggle() {
    const next = !displayCompleted;
    setOptimisticCompleted(next);
    onToggleCompleted(task.id).catch(() => {
      setOptimisticCompleted(null);
      toast.error("Failed to update task. Please try again.");
    });
  }

  function openDetail(editing: boolean) {
    if (detailHref) {
      router.push(detailHref);
      return;
    }
    setDetail({ open: true, editing });
  }

  const rowKeys = useRowKeys({ onToggle: handleToggle });

  const titleContent = (
    <span
      className={[
        "block truncate text-sm text-foreground",
        displayCompleted ? "line-through" : "",
      ].join(" ")}
    >
      {task.title}
    </span>
  );

  return (
    <>
      <div className={`${rowShell} items-center p-2`} {...rowKeys}>
        <CircularCheckboxProgress
          className={`${rowControl} ${displayCompleted ? "opacity-50" : ""}`}
          size={28}
          stroke={4}
          progress={displayCompleted ? 1 : 0}
          complete={displayCompleted}
          onClick={handleToggle}
          ariaLabel={
            displayCompleted
              ? `Mark ${task.title} incomplete`
              : `Mark ${task.title} complete`
          }
        />

        <div
          className={[
            "flex min-w-0 flex-1 items-center gap-2 overflow-hidden",
            displayCompleted ? "opacity-50" : "",
          ].join(" ")}
        >
          {projectName && (
            <Badge className="bg-fill-strong text-subtle">{projectName}</Badge>
          )}

          {detailHref ? (
            <Link
              href={detailHref}
              className={rowLink}
              {...{ [ROW_ATTR]: "task" }}
            >
              {titleContent}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openDetail(false)}
              className={rowLink}
              {...{ [ROW_ATTR]: "task" }}
            >
              {titleContent}
            </button>
          )}

          <span className="flex shrink-0 items-center gap-1">
            {showScopeLabel !== false && <PeriodBadge period={scope} />}
            {openSinceLabel && (
              <Badge className="bg-warning-soft text-warning-muted">
                {openSinceLabel}
              </Badge>
            )}
          </span>
        </div>

        <TaskActionMenu task={task} onEdit={() => openDetail(true)} />
      </div>

      {!detailHref && (
        // Remounting on the edit flag lets the modal take it as initial state
        // instead of syncing a prop into state from an effect.
        <TaskDetailsModal
          key={detail.editing ? "edit" : "view"}
          open={detail.open}
          defaultEditing={detail.editing}
          onOpenChange={(open) => setDetail((d) => ({ ...d, open }))}
          task={task}
        />
      )}
    </>
  );
}
