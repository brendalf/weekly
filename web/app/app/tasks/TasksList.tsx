"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@heroui/react";
import { ListCheck, Plus } from "@gravity-ui/icons";
import {
  Period,
  formatPeriodKey,
  selectedPeriodKey,
  taskPeriodKey,
  type Task,
} from "@weekly/domain";
import { Collapsible, EmptyState } from "../../components/ui";
import { TaskAddModal } from "../../components/tasks/TaskAddModal";
import { TaskItem } from "../../components/tasks/TaskItem";
import { useAppData } from "../../components/shell/AppDataProvider";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useActivityLog } from "../../hooks/useActivityLog";
import { useWorkspaceSelection } from "../../stores/workspace";

type Bucket = "overdue" | "now" | "later" | "completed";

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "now", label: "Now" },
  { key: "later", label: "Later" },
  { key: "completed", label: "Completed" },
];

/**
 * Which bucket a task falls in, judged against *today* rather than the week
 * selected on `/app/week` — this route is the whole backlog, not a week's slice.
 *
 * A task's period is its own scope's period, so a day-scoped task is overdue a
 * day later while a month-scoped one has until the month ends.
 */
function bucketOf(task: Task, today: Date): Bucket {
  if (task.completed) return "completed";
  const scope = task.scope ?? Period.WEEK;
  const taskKey = taskPeriodKey(task);
  const nowKey = selectedPeriodKey(scope, today);
  if (taskKey < nowKey) return "overdue";
  if (taskKey > nowKey) return "later";
  return "now";
}

/**
 * `/app/tasks` — every task, bucketed by whether it is late, live, or waiting
 * (DIRECTION §3).
 *
 * WS6 owns the rest: the one-click "move to this week" on an overdue row
 * (today the row states the problem and offers nothing), the scope / workspace
 * / completion filters, and replacing the raw `<select>` and
 * `<input type="date">` in the task detail with HeroUI `Select` and
 * `DatePicker`.
 */
export function TasksList() {
  const {
    tasks,
    workspaces,
    pickerWorkspaces,
    showCompletedTasks,
    toggleTaskCompleted,
  } = useAppData();
  const { activeRepos, getWorkspaceRepos, getTaskProjectId } =
    useRepositoryContext();
  const logActivity = useActivityLog();
  const selection = useWorkspaceSelection();

  const handleAddTask = useCallback(
    async (title: string, workspaceId?: string, scope?: Period) => {
      const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
      const taskId = await repos?.task.addTask(title, scope, new Date());
      if (!taskId) return;
      logActivity(workspaceId ?? selection.singleId, {
        type: "task_added",
        itemId: taskId,
        itemName: title,
      });
    },
    [activeRepos, getWorkspaceRepos, logActivity, selection.singleId],
  );

  const buckets = useMemo(() => {
    const today = new Date();
    const grouped = new Map<Bucket, Task[]>(
      BUCKETS.map(({ key }) => [key, [] as Task[]]),
    );
    for (const task of tasks) grouped.get(bucketOf(task, today))!.push(task);
    for (const list of grouped.values()) {
      list.sort((a, b) => taskPeriodKey(a).localeCompare(taskPeriodKey(b)));
    }
    return grouped;
  }, [tasks]);

  const addButton = (
    <TaskAddModal
      onSubmit={handleAddTask}
      workspaces={pickerWorkspaces}
      trigger={
        <Button size="sm" variant="outline" className="min-h-11">
          <Plus width={16} height={16} />
          Add task
        </Button>
      }
    />
  );

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListCheck width={20} height={20} />}
        headline="No tasks yet"
        body="A task happens once. Give it a day, a week, or a month and it shows up on your week planner."
        action={addButton}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">{addButton}</div>

      {BUCKETS.map(({ key, label }) => {
        if (key === "completed" && !showCompletedTasks) return null;
        const bucketTasks = buckets.get(key) ?? [];
        if (bucketTasks.length === 0) return null;
        return (
          <Collapsible
            key={key}
            label={label}
            count={bucketTasks.length}
            storageKey={`tasks:${key}`}
            defaultCollapsed={key === "completed"}
            bodyClassName="flex flex-col gap-0.5 pt-1"
          >
            {bucketTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleCompleted={toggleTaskCompleted}
                detailHref={`/app/tasks/${task.id}`}
                openSinceLabel={
                  key === "overdue"
                    ? formatPeriodKey(
                        taskPeriodKey(task),
                        task.scope ?? Period.WEEK,
                      )
                    : undefined
                }
                projectName={
                  selection.isSingle
                    ? undefined
                    : workspaces.find((w) => w.id === getTaskProjectId(task.id))
                        ?.name
                }
              />
            ))}
          </Collapsible>
        );
      })}
    </div>
  );
}
