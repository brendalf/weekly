"use client";

import React, { useState } from "react";
import { Habit, Task, Project, HabitPeriod } from "@weekly/domain";
import { Plus, LayoutCells, LayoutColumns, BarsAscendingAlignLeftArrowDown } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import type { LayoutPreference } from "@weekly/domain";
import { HabitList } from "./habits/HabitList";
import { TaskList } from "./tasks/TaskList";
import { HabitAddModal } from "./habits/HabitAddModal";
import { TaskAddModal } from "./tasks/TaskAddModal";
import { useRepositoryContext } from "../contexts/RepositoryContext";

interface HabitsTasksViewProps {
  habits: Habit[];
  tasks: Task[];
  projects?: Project[];
  layout: LayoutPreference;
  userId: string;
  onToggleTaskCompleted: (taskId: string) => void;
  onLayoutChange: (layout: LayoutPreference) => void;
}

function LayoutSettingsButton({
  layout,
  onLayoutChange,
}: {
  layout: LayoutPreference;
  onLayoutChange: (layout: LayoutPreference) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="sm"
        isIconOnly
        aria-label="Layout settings"
        variant="ghost"
        onPress={() => setOpen((v) => !v)}
      >
        {layout === "tabs" ? <LayoutCells /> : <LayoutColumns />}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-xl border border-foreground/10 bg-surface p-1 shadow-lg">
            {([
              { key: "tabs", label: "Tabs", Icon: LayoutCells },
              { key: "side-by-side", label: "Side by side", Icon: LayoutColumns },
              { key: "sequential", label: "Sequential", Icon: BarsAscendingAlignLeftArrowDown },
            ] as { key: LayoutPreference; label: string; Icon: React.ComponentType<{ width?: number; height?: number }> }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { onLayoutChange(key); setOpen(false); }}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors cursor-pointer",
                  layout === key ? "text-primary font-medium" : "text-foreground",
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

export function HabitsTasksView({
  habits,
  tasks,
  projects,
  layout,
  userId: _userId,
  onToggleTaskCompleted,
  onLayoutChange,
}: HabitsTasksViewProps) {
  const [activeTab, setActiveTab] = useState<"habits" | "tasks">("habits");
  const [collapsed, setCollapsed] = useState(false);
  const [habitsCompleted, setHabitsCompleted] = useState(0);
  const { activeRepos, getProjectRepos } = useRepositoryContext();

  const tasksCompleted = tasks.filter((t) => t.completed).length;

  const handleAddHabit = (
    name: string,
    times: number,
    period: HabitPeriod,
    projectId?: string,
  ) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    repos?.habit.addHabit(name, times, period);
  };

  const handleAddTask = (title: string, projectId?: string) => {
    const repos = projectId ? getProjectRepos(projectId) : activeRepos;
    repos?.task.addTask(title);
  };

  if (layout === "tabs") {
    return (
      <div className="">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setCollapsed((v) => !v)}
        >
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {(["habits", "tasks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCollapsed(false); }}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  activeTab === tab
                    ? "bg-foreground/8 text-foreground"
                    : "text-foreground/50 hover:text-foreground/80",
                ].join(" ")}
              >
                {tab === "habits" ? "Habits" : "Tasks"}
              </button>
            ))}
          </div>

          {collapsed && (
            <p className="text-xs text-foreground/50">
              {activeTab === "habits"
                ? `${habitsCompleted}/${habits.length}`
                : `${tasksCompleted}/${tasks.length}`}
            </p>
          )}

          <div className="flex-1" />

          {(activeRepos || projects) && (
            <div onClick={(e) => e.stopPropagation()}>
              {activeTab === "habits" ? (
                <HabitAddModal
                  onSubmit={handleAddHabit}
                  projects={projects}
                  trigger={
                    <Button size="sm" isIconOnly aria-label="Add habit" variant="ghost">
                      <Plus />
                    </Button>
                  }
                />
              ) : (
                <TaskAddModal
                  onSubmit={handleAddTask}
                  projects={projects}
                  trigger={
                    <Button size="sm" isIconOnly aria-label="Add task" variant="ghost">
                      <Plus />
                    </Button>
                  }
                />
              )}
            </div>
          )}

          <div onClick={(e) => e.stopPropagation()}>
            <LayoutSettingsButton layout={layout} onLayoutChange={onLayoutChange} />
          </div>
        </div>

        <div className={`collapsible${collapsed ? " collapsed" : ""}`}>
          <div>
            <div className="mt-2">
              {activeTab === "habits" ? (
                <HabitList hideHeader habits={habits} projects={projects} onCompletedCountChange={setHabitsCompleted} />
              ) : (
                <TaskList
                  hideHeader
                  tasks={tasks}
                  onToggleCompleted={onToggleTaskCompleted}
                  projects={projects}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "sequential") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <LayoutSettingsButton layout={layout} onLayoutChange={onLayoutChange} />
        </div>
        <HabitList habits={habits} projects={projects} />
        <TaskList tasks={tasks} onToggleCompleted={onToggleTaskCompleted} projects={projects} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <LayoutSettingsButton layout={layout} onLayoutChange={onLayoutChange} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <HabitList habits={habits} projects={projects} />
        </section>
        <section>
          <TaskList
            tasks={tasks}
            onToggleCompleted={onToggleTaskCompleted}
            projects={projects}
          />
        </section>
      </div>
    </div>
  );
}
