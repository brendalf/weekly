"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Habit,
  Task,
  Workspace,
  Period,
  HabitTimeOfDay,
  filterHabitsByDay,
  isHabitSkipped,
  getTaskVisibility,
  PERIOD_TABS,
} from "@weekly/domain";
import { Eye, Plus } from "@gravity-ui/icons";
import { HabitAddModal } from "./habits/HabitAddModal";
import { TaskAddModal } from "./tasks/TaskAddModal";
import { PeriodPanel } from "./PeriodPanel";
import { SearchBox } from "./general/SearchBox";
import { ActionMenu, focusRing } from "./ui";
import type { ActionMenuEntry } from "./ui";
import { useHabitTaskSearch } from "../hooks/useHabitTaskSearch";
import { useRepositoryContext } from "../contexts/RepositoryContext";
import { useActivityLog } from "../hooks/useActivityLog";
import { useCalendarStore } from "../stores/calendar";
import { useWorkspaceSelection } from "../stores/workspace";

interface HabitsTasksViewProps {
  habits: Habit[];
  tasks: Task[];
  workspaces?: Workspace[];
  showCompletedTasks: boolean;
  showSkippedHabits: boolean;
  onToggleTaskCompleted: (taskId: string) => Promise<void>;
  onShowCompletedTasksChange: (show: boolean) => void;
  onShowSkippedHabitsChange: (show: boolean) => void;
}

const noHabitMatchesMessage = "No habits match your filter.";
const noTaskMatchesMessage = "No tasks match your filter.";

/** Tiny read-only ring showing done/total progress. */
function PeriodProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const size = 18;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, done / total));
  const complete = done >= total;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden
    >
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="var(--fill-strong)" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        stroke={complete ? "var(--brand)" : "var(--brand-border)"}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 250ms var(--ease-standard)" }}
      />
    </svg>
  );
}

/**
 * Display state for the lists: completed tasks and skipped habits.
 *
 * All that is left of the old `LayoutSettingsButton`. Its 2×2 `layout` ×
 * `innerLayout` matrix is gone (DIRECTION §3, "what dies") — one layout per
 * route — and what remains is on the shared `ActionMenu`, so it closes on
 * `Esc`, traps focus, and repositions on scroll.
 *
 * WS11 promotes these two to visible chips on the list routes; they are display
 * state, not search, and they do not belong in a gear popover.
 */
function DisplayOptionsMenu({
  showCompletedTasks,
  showSkippedHabits,
  onShowCompletedTasksChange,
  onShowSkippedHabitsChange,
}: {
  showCompletedTasks: boolean;
  showSkippedHabits: boolean;
  onShowCompletedTasksChange: (show: boolean) => void;
  onShowSkippedHabitsChange: (show: boolean) => void;
}) {
  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    if (showCompletedTasks) keys.add("completed");
    if (showSkippedHabits) keys.add("skipped");
    return keys;
  }, [showCompletedTasks, showSkippedHabits]);

  return (
    <ActionMenu
      label="Display options"
      trigger={<Eye width={16} height={16} />}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        const next =
          keys === "all" ? new Set<string>(["completed", "skipped"]) : keys;
        onShowCompletedTasksChange(next.has("completed"));
        onShowSkippedHabitsChange(next.has("skipped"));
      }}
      items={[
        { key: "completed", label: "Show completed" },
        { key: "skipped", label: "Show skipped habits" },
      ]}
    />
  );
}

/** Add a habit or a task to the selected week. */
function AddMenu({
  workspaces,
  onAddHabit,
  onAddTask,
}: {
  workspaces?: Workspace[];
  onAddHabit: (
    name: string,
    times: number,
    period: Period,
    workspaceId?: string,
    activeDays?: number[],
    timeOfDay?: HabitTimeOfDay,
  ) => void;
  onAddTask: (title: string, workspaceId?: string, scope?: Period) => void;
}) {
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const items: ActionMenuEntry[] = [
    { key: "habit", label: "Add habit", onAction: () => setHabitModalOpen(true) },
    { key: "task", label: "Add task", onAction: () => setTaskModalOpen(true) },
  ];

  return (
    <>
      <ActionMenu
        label="Add"
        trigger={<Plus width={16} height={16} />}
        items={items}
      />

      <HabitAddModal
        isOpen={habitModalOpen}
        onOpenChange={setHabitModalOpen}
        onSubmit={onAddHabit}
        workspaces={workspaces}
        trigger={<span style={{ display: "none" }} />}
      />
      <TaskAddModal
        isOpen={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSubmit={onAddTask}
        workspaces={workspaces}
        trigger={<span style={{ display: "none" }} />}
      />
    </>
  );
}

/**
 * The week planner's habits and tasks, in one layout.
 *
 * WS3 removed the `layout` / `innerLayout` preferences and with them the second
 * copy of the habits/tasks sections this file used to hold — `PeriodPanel`
 * renders them. Notes left too: they are workspace context, not weekly work,
 * and live at `/app/notes` (DIRECTION §3).
 *
 * WS4 owns what is left: folding `WeekPicker` + `WeekdaysCarousel` + these
 * period tabs into one header, making the week (not the day) the default scope,
 * and the starter-habit empty state.
 */
export function HabitsTasksView({
  habits: allHabits,
  tasks: allTasks,
  workspaces,
  showCompletedTasks,
  showSkippedHabits,
  onToggleTaskCompleted,
  onShowCompletedTasksChange,
  onShowSkippedHabitsChange,
}: HabitsTasksViewProps) {
  const [activePeriodTab, setActivePeriodTab] = useState<Period>(Period.DAY);
  const [habitCompletions, setHabitCompletions] = useState<Record<string, boolean>>({});

  // Everything below renders the searched lists; with no query they are the full ones.
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    isActive: isSearchActive,
    isSearching,
    habits,
    tasks,
  } = useHabitTaskSearch(allHabits, allTasks);
  const { activeRepos, getWorkspaceRepos } = useRepositoryContext();
  const logActivity = useActivityLog();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDay = useMemo(
    () => (selectedDayISO ? new Date(selectedDayISO) : new Date()),
    [selectedDayISO],
  );
  const selection = useWorkspaceSelection();
  const singleWorkspaceId = selection.singleId;

  const handleHabitsCompleted = useCallback((completions: Record<string, boolean>) => {
    setHabitCompletions((prev) => ({ ...prev, ...completions }));
  }, []);

  const handleAddHabit = useCallback(
    async (name: string, times: number, period: Period, workspaceId?: string, activeDays?: number[], timeOfDay?: HabitTimeOfDay) => {
      const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
      const habitId = await repos?.habit.addHabit(name, times, period, selectedDay, activeDays, timeOfDay);
      if (!habitId) return;
      logActivity(workspaceId ?? singleWorkspaceId, {
        type: "habit_added",
        itemId: habitId,
        itemName: name,
      });
    },
    [activeRepos, getWorkspaceRepos, selectedDay, singleWorkspaceId, logActivity],
  );

  const handleAddTask = useCallback(
    async (title: string, workspaceId?: string, scope?: Period) => {
      const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
      const taskId = await repos?.task.addTask(title, scope, selectedDay);
      if (!taskId) return;
      logActivity(workspaceId ?? singleWorkspaceId, {
        type: "task_added",
        itemId: taskId,
        itemName: title,
      });
    },
    [activeRepos, getWorkspaceRepos, selectedDay, singleWorkspaceId, logActivity],
  );

  const periodProgress = useMemo(() => {
    const visibleHabits = filterHabitsByDay(habits, selectedDay);
    return PERIOD_TABS.map(({ period, label }) => {
      const ph = visibleHabits.filter(
        (h) => h.period === period && !isHabitSkipped(h, selectedDay),
      );
      const pt = tasks.filter(
        (t) => (t.scope ?? Period.WEEK) === period && getTaskVisibility(t, selectedDay) !== "hidden",
      );
      const done =
        ph.filter((h) => habitCompletions[h.id]).length +
        pt.filter((t) => t.completed).length;
      const total = ph.length + pt.length;
      return { period, label, done, total };
    });
  }, [habits, tasks, selectedDay, habitCompletions]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {PERIOD_TABS.map(({ period, label }) => {
            const prog = periodProgress.find((p) => p.period === period);
            const isActive = activePeriodTab === period;
            return (
              <button
                key={label}
                onClick={() => setActivePeriodTab(period)}
                className={[
                  "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-fill text-foreground"
                    : "text-subtle hover:text-foreground",
                  focusRing,
                ].join(" ")}
              >
                {label}
                {prog && <PeriodProgress done={prog.done} total={prog.total} />}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <SearchBox
          label="Filter habits and tasks"
          placeholder="Filter…"
          value={searchQuery}
          onChange={setSearchQuery}
          isSearching={isSearching}
          className="w-32 sm:w-56"
        />

        {(activeRepos || workspaces) && (
          <AddMenu
            workspaces={workspaces}
            onAddHabit={handleAddHabit}
            onAddTask={handleAddTask}
          />
        )}
        <DisplayOptionsMenu
          showCompletedTasks={showCompletedTasks}
          showSkippedHabits={showSkippedHabits}
          onShowCompletedTasksChange={onShowCompletedTasksChange}
          onShowSkippedHabitsChange={onShowSkippedHabitsChange}
        />
      </div>

      <div>
        {PERIOD_TABS.map(({ period }) => (
          <div key={period} className={activePeriodTab !== period ? "hidden" : ""}>
            <PeriodPanel
              period={period}
              habits={habits}
              tasks={tasks}
              workspaces={workspaces}
              showHabitPeriodLabel={false}
              showTaskScopeLabel={false}
              showCompletedTasks={showCompletedTasks}
              showSkippedHabits={showSkippedHabits}
              habitsEmptyMessage={isSearchActive ? noHabitMatchesMessage : undefined}
              tasksEmptyMessage={isSearchActive ? noTaskMatchesMessage : undefined}
              onToggleTaskCompleted={onToggleTaskCompleted}
              onHabitsCompleted={handleHabitsCompleted}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
