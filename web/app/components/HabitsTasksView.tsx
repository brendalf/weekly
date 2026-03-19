"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Habit,
  Task,
  Project,
  HabitPeriod,
  HabitTimeOfDay,
  TaskScope,
  filterHabitsByDay,
  isHabitSkipped,
  getTaskVisibility,
} from "@weekly/domain";
import {
  Plus,
  LayoutCells,
  LayoutColumns,
  BarsAscendingAlignLeftArrowDown,
  ChevronsUp,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import type { LayoutPreference } from "@weekly/domain";
import { HabitList } from "./habits/HabitList";
import { TaskList } from "./tasks/TaskList";
import { HabitAddModal } from "./habits/HabitAddModal";
import { TaskAddModal } from "./tasks/TaskAddModal";
import { PeriodPanel } from "./PeriodPanel";
import { useRepositoryContext } from "../contexts/RepositoryContext";
import { useCalendarStore } from "../stores/calendar";

type InnerLayout = "sequential" | "side-by-side";

interface HabitsTasksViewProps {
  habits: Habit[];
  tasks: Task[];
  projects?: Project[];
  layout: LayoutPreference;
  onToggleTaskCompleted: (taskId: string) => void;
  onLayoutChange: (layout: LayoutPreference) => void;
}

const PERIOD_TABS: { period: HabitPeriod; scope: TaskScope; label: string }[] = [
  { period: HabitPeriod.Day, scope: "day", label: "Day" },
  { period: HabitPeriod.Week, scope: "week", label: "Week" },
  { period: HabitPeriod.Month, scope: "month", label: "Month" },
];

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
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="currentColor" strokeOpacity={0.15} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        stroke={complete ? "var(--color-purple-500)" : "rgba(168,85,247,0.55)"}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
    </svg>
  );
}

function LayoutSettingsButton({
  layout,
  innerLayout,
  onLayoutChange,
  onInnerLayoutChange,
}: {
  layout: LayoutPreference;
  innerLayout: InnerLayout;
  onLayoutChange: (layout: LayoutPreference) => void;
  onInnerLayoutChange: (il: InnerLayout) => void;
}) {
  const [open, setOpen] = useState(false);

  const icon =
    layout === "period-tabs" ? <LayoutCells /> : <BarsAscendingAlignLeftArrowDown />;

  return (
    <div className="relative">
      <Button
        size="sm"
        isIconOnly
        aria-label="Layout settings"
        variant="ghost"
        onPress={() => setOpen((v) => !v)}
      >
        {icon}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-foreground/10 bg-surface p-1 shadow-lg">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
              Navigation
            </p>
            {([
              { key: "period-tabs", label: "Tabs", Icon: LayoutCells },
              { key: "period-sequential", label: "Overview", Icon: BarsAscendingAlignLeftArrowDown },
            ] as { key: LayoutPreference; label: string; Icon: React.ComponentType<{ width?: number; height?: number }> }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { onLayoutChange(key); setOpen(false); }}
                className={[
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors",
                  layout === key ? "text-primary font-medium" : "text-foreground",
                ].join(" ")}
              >
                <Icon width={12} height={12} />
                {label}
              </button>
            ))}

            <div className="my-1 mx-2 border-t border-foreground/10" />

            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
              Period layout
            </p>
            {([
              { key: "sequential" as InnerLayout, label: "Sequential", Icon: BarsAscendingAlignLeftArrowDown },
              { key: "side-by-side" as InnerLayout, label: "Side by side", Icon: LayoutColumns },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { onInnerLayoutChange(key); setOpen(false); }}
                className={[
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors",
                  innerLayout === key ? "text-primary font-medium" : "text-foreground",
                ].join(" ")}
              >
                <Icon width={12} height={12} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UnifiedAddButton({
  projects,
  onAddHabit,
  onAddTask,
}: {
  projects?: Project[];
  onAddHabit: (name: string, times: number, period: HabitPeriod, projectId?: string, activeDays?: number[], timeOfDay?: HabitTimeOfDay) => void;
  onAddTask: (title: string, projectId?: string, scope?: TaskScope) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const itemClass =
    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-foreground/5 transition-colors";

  return (
    <div className="relative">
      <Button
        size="sm"
        isIconOnly
        aria-label="Add"
        variant="ghost"
        onPress={() => setDropdownOpen((v) => !v)}
      >
        <Plus />
      </Button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-xl border border-foreground/10 bg-surface p-1 shadow-lg">
            <button
              className={itemClass}
              onClick={() => { setDropdownOpen(false); setHabitModalOpen(true); }}
            >
              Add Habit
            </button>
            <button
              className={itemClass}
              onClick={() => { setDropdownOpen(false); setTaskModalOpen(true); }}
            >
              Add Task
            </button>
          </div>
        </>
      )}

      <HabitAddModal
        isOpen={habitModalOpen}
        onOpenChange={setHabitModalOpen}
        onSubmit={onAddHabit}
        projects={projects}
        trigger={<span style={{ display: "none" }} />}
      />
      <TaskAddModal
        isOpen={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        onSubmit={onAddTask}
        projects={projects}
        trigger={<span style={{ display: "none" }} />}
      />
    </div>
  );
}

export function HabitsTasksView({
  habits,
  tasks,
  projects,
  layout,
  onToggleTaskCompleted,
  onLayoutChange,
}: HabitsTasksViewProps) {
  const [activePeriodTab, setActivePeriodTab] = useState<HabitPeriod>(HabitPeriod.Day);
  const [innerLayout, setInnerLayout] = useState<InnerLayout>("sequential");
  const [habitCompletions, setHabitCompletions] = useState<Record<string, boolean>>({});
  const { activeRepos, getProjectRepos } = useRepositoryContext();
  const selectedDayISO = useCalendarStore((s) => s.selectedDayISO);
  const selectedDay = selectedDayISO ? new Date(selectedDayISO) : new Date();

  // Merge completions from all period panels without overwriting each other
  const handleHabitsCompleted = useCallback((completions: Record<string, boolean>) => {
    setHabitCompletions((prev) => ({ ...prev, ...completions }));
  }, []);

  const handleAddHabit = useCallback(
    (name: string, times: number, period: HabitPeriod, projectId?: string, activeDays?: number[], timeOfDay?: HabitTimeOfDay) => {
      const repos = projectId ? getProjectRepos(projectId) : activeRepos;
      const date = selectedDayISO ? new Date(selectedDayISO) : new Date();
      repos?.habit.addHabit(name, times, period, date, activeDays, timeOfDay);
    },
    [activeRepos, getProjectRepos, selectedDayISO],
  );

  const handleAddTask = useCallback(
    (title: string, projectId?: string, scope?: TaskScope) => {
      const repos = projectId ? getProjectRepos(projectId) : activeRepos;
      repos?.task.addTask(title, scope, selectedDay);
    },
    [activeRepos, getProjectRepos, selectedDay],
  );

  // Per-period progress for circular indicators
  const periodProgress = useMemo(() => {
    const visibleHabits = filterHabitsByDay(habits, selectedDay);
    return PERIOD_TABS.map(({ period, scope, label }) => {
      const ph = visibleHabits.filter(
        (h) => h.period === period && !isHabitSkipped(h, selectedDay),
      );
      const pt = tasks.filter(
        (t) => (t.scope ?? "week") === scope && getTaskVisibility(t, selectedDay) !== "hidden",
      );
      const done =
        ph.filter((h) => habitCompletions[h.id]).length +
        pt.filter((t) => t.completed).length;
      const total = ph.length + pt.length;
      return { period, label, done, total };
    });
  }, [habits, tasks, selectedDay, habitCompletions]);

  const isPeriodTabs = layout !== "period-sequential";

  // Overview mode collapse state
  const [collapsedOverviewHabits, setCollapsedOverviewHabits] = useState(false);
  const [collapsedOverviewTasks, setCollapsedOverviewTasks] = useState(false);

  const overviewHabitTotal = useMemo(
    () => filterHabitsByDay(habits, selectedDay).filter((h) => !isHabitSkipped(h, selectedDay)).length,
    [habits, selectedDay],
  );
  const overviewHabitDone = Object.values(habitCompletions).filter(Boolean).length;
  const overviewTaskTotal = useMemo(
    () => tasks.filter((t) => getTaskVisibility(t, selectedDay) !== "hidden").length,
    [tasks, selectedDay],
  );
  const overviewTaskDone = useMemo(
    () => tasks.filter((t) => getTaskVisibility(t, selectedDay) !== "hidden" && t.completed).length,
    [tasks, selectedDay],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row — stable position regardless of layout */}
      <div className="flex items-center gap-2">
        {isPeriodTabs ? (
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
                      ? "bg-foreground/8 text-foreground"
                      : "text-foreground/50 hover:text-foreground/80",
                  ].join(" ")}
                >
                  {label}
                  {prog && <PeriodProgress done={prog.done} total={prog.total} />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-foreground/8 text-foreground">
            Overview
            <PeriodProgress
              done={periodProgress.reduce((s, p) => s + p.done, 0)}
              total={periodProgress.reduce((s, p) => s + p.total, 0)}
            />
          </div>
        )}

        <div className="flex-1" />

        {(activeRepos || projects) && (
          <UnifiedAddButton
            projects={projects}
            onAddHabit={handleAddHabit}
            onAddTask={handleAddTask}
          />
        )}
        <LayoutSettingsButton
          layout={layout}
          innerLayout={innerLayout}
          onLayoutChange={onLayoutChange}
          onInnerLayoutChange={setInnerLayout}
        />
      </div>

      {/* Content */}
      {isPeriodTabs ? (
        <div>
          {PERIOD_TABS.map(({ period, scope }) => (
            <div key={period} className={activePeriodTab !== period ? "hidden" : ""}>
              <PeriodPanel
                period={period}
                scope={scope}
                habits={habits}
                tasks={tasks}
                projects={projects}
                innerLayout={innerLayout}
                showHabitPeriodLabel={false}
                showTaskScopeLabel={false}
                onToggleTaskCompleted={onToggleTaskCompleted}
                onHabitsCompleted={handleHabitsCompleted}
              />
            </div>
          ))}
        </div>
      ) : (() => {
        const habitSection = (
          <div>
            <div
              className="flex items-center gap-1.5 cursor-pointer select-none pb-1"
              onClick={() => setCollapsedOverviewHabits((v) => !v)}
            >
              {collapsedOverviewHabits && (
                <ChevronsUp width={12} height={12} className="text-foreground/40 shrink-0" />
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Habits</p>
              {collapsedOverviewHabits && overviewHabitTotal > 0 && (
                <p className="text-xs text-foreground/30">{overviewHabitDone}/{overviewHabitTotal}</p>
              )}
            </div>
            <div className={`collapsible${collapsedOverviewHabits ? " collapsed" : ""}`}>
              <div>
                <HabitList
                  hideHeader
                  habits={habits}
                  projects={projects}
                  showPeriodLabel={true}
                  onHabitsCompleted={handleHabitsCompleted}
                />
              </div>
            </div>
          </div>
        );
        const taskSection = (
          <div>
            <div
              className="flex items-center gap-1.5 cursor-pointer select-none pb-1"
              onClick={() => setCollapsedOverviewTasks((v) => !v)}
            >
              {collapsedOverviewTasks && (
                <ChevronsUp width={12} height={12} className="text-foreground/40 shrink-0" />
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Tasks</p>
              {collapsedOverviewTasks && overviewTaskTotal > 0 && (
                <p className="text-xs text-foreground/30">{overviewTaskDone}/{overviewTaskTotal}</p>
              )}
            </div>
            <div className={`collapsible${collapsedOverviewTasks ? " collapsed" : ""}`}>
              <div>
                <TaskList
                  hideHeader
                  tasks={tasks}
                  onToggleCompleted={onToggleTaskCompleted}
                  projects={projects}
                  showScopeLabel={true}
                />
              </div>
            </div>
          </div>
        );
        if (innerLayout === "side-by-side") {
          return (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section>{habitSection}</section>
              <section>{taskSection}</section>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-3">
            {habitSection}
            {taskSection}
          </div>
        );
      })()}
    </div>
  );
}
