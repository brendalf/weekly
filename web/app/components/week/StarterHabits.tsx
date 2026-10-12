"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ListCheck } from "@gravity-ui/icons";
import {
  habitCadenceLabel,
  STARTER_HABITS,
  type StarterHabit,
  type Workspace,
} from "@weekly/domain";
import { toast } from "sonner";
import { EmptyState, focusRing } from "../ui";
import { HabitAddModal } from "../habits/HabitAddModal";
import { TaskAddModal } from "../tasks/TaskAddModal";
import type { AddHabit, AddTask } from "./WeekToolbar";

interface StarterHabitsProps {
  /** Shown in the add modals when more than one workspace is in view. */
  workspaces?: Workspace[];
  /** Creates one starter habit. Rejects so the failure can be surfaced. */
  onCreateStarter: (starter: StarterHabit) => Promise<void>;
  onAddHabit: AddHabit;
  onAddTask: AddTask;
}

/**
 * What a brand-new week looks like (DIRECTION §7).
 *
 * Before this, a first-time user reached the product's hero route and was told
 * `No habits yet.` in 12px at 60% opacity — a dead end, on the one screen the
 * landing page had just promised four features about. An empty screen is an
 * invitation, so this one is: five habits, one click each, picked to cover
 * every cadence so the first choice also teaches the model.
 *
 * Shown only when the workspaces in view hold no habits *and* no tasks. Once
 * anything exists the normal plan takes over, and the per-section empty
 * messages handle a scope that happens to be empty.
 */
export function StarterHabits({
  workspaces,
  onCreateStarter,
  onAddHabit,
  onAddTask,
}: StarterHabitsProps) {
  const [pending, setPending] = useState<string | null>(null);

  async function create(starter: StarterHabit) {
    if (pending) return;
    setPending(starter.name);
    try {
      await onCreateStarter(starter);
      // On success this whole empty state unmounts — the week is no longer
      // empty — so there is no pending state left to clear.
    } catch {
      setPending(null);
      toast.error(`Could not add “${starter.name}”. Please try again.`);
    }
  }

  return (
    <EmptyState
      icon={<ListCheck width={20} height={20} />}
      headline="Your week is empty"
      body="Decide what matters once, then check it off day by day."
      action={
        <div className="flex flex-col items-center gap-4">
          <ul className="flex flex-wrap justify-center gap-2">
            {STARTER_HABITS.map((starter) => (
              <li key={starter.name}>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void create(starter)}
                  className={[
                    "flex min-h-11 cursor-pointer flex-col items-start rounded-lg border border-border px-3 py-1.5 text-left transition-colors",
                    "hover:border-brand-border hover:bg-brand-soft",
                    "disabled:cursor-default disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent",
                    focusRing,
                  ].join(" ")}
                >
                  <span className="text-sm font-medium text-foreground">
                    {starter.name}
                  </span>
                  <span className="text-xs text-subtle">
                    {pending === starter.name
                      ? "Adding…"
                      : habitCadenceLabel(
                          starter.times,
                          starter.period,
                          starter.timeOfDay,
                        )}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap justify-center gap-2">
            <HabitAddModal
              onSubmit={onAddHabit}
              workspaces={workspaces}
              trigger={
                <Button size="sm" variant="outline">
                  Add your own habit
                </Button>
              }
            />
            <TaskAddModal
              onSubmit={onAddTask}
              workspaces={workspaces}
              trigger={
                <Button size="sm" variant="outline">
                  Add a task
                </Button>
              }
            />
          </div>
        </div>
      }
    />
  );
}
