"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import { Flame, Pencil } from "@gravity-ui/icons";
import {
  Period,
  formatPeriodKey,
  habitCadenceLabel,
  type Habit,
} from "@weekly/domain";
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
  HabitEditFields,
  useHabitEditForm,
} from "../../../components/habits/HabitEditForm";
import { useAppData } from "../../../components/shell/AppDataProvider";
import { useRepositoryContext } from "../../../contexts/RepositoryContext";
import {
  completionPercent,
  useHabitStats,
} from "../../../hooks/useHabitStats";

/** `activeDays` is 0=Sun … 6=Sat. */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * `/app/habits/:id` — one habit, in the shared `DetailPanel` (DIRECTION §5):
 * a right-side panel at `lg:`+, a bottom sheet below it. Deep-linkable, and
 * the browser Back button closes it.
 *
 * WS5 gave it the thing it was missing: a **real edit mode**. The panel shipped
 * view-only, so the row's `⋯ → Edit` routed here and then offered nothing to
 * edit. The form is `HabitEditForm`, shared with the `HabitDetailsModal` that
 * `/app/week` still uses, so there is one habit form in the app rather than
 * two that drift.
 *
 * The 84-day history calendar stays in the modal for now; moving it into a
 * 420px panel is a responsive problem of its own (PLAN WS13).
 */
export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { habits, workspacesLoaded } = useAppData();

  const habit = habits.find((h) => h.id === id) ?? null;

  function close() {
    // `push`, not `back()`: a visitor who opened the deep link directly has no
    // history entry to return to.
    router.push("/app/habits");
  }

  if (habit) {
    // Keyed so switching habits inside an open panel re-seeds the draft rather
    // than carrying one habit's edits onto another.
    return <HabitPanel key={habit.id} habit={habit} onClose={close} />;
  }

  return (
    <DetailPanel
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="Habit"
      ariaLabel="Habit details"
    >
      {workspacesLoaded ? (
        <EmptyState
          headline="This habit is gone"
          body="It was deleted, or it lives in a workspace that is not in view."
          action={
            <Button variant="outline" className="min-h-11" onPress={close}>
              Back to habits
            </Button>
          }
        />
      ) : (
        <SkeletonList count={3} label="Loading habit" />
      )}
    </DetailPanel>
  );
}

function HabitPanel({
  habit,
  onClose,
}: {
  habit: Habit;
  onClose: () => void;
}) {
  const { workspaces } = useAppData();
  const { getHabitRepos, getHabitProjectId } = useRepositoryContext();
  const [editing, setEditing] = useState(false);
  const form = useHabitEditForm(habit);

  const workspaceId = getHabitProjectId(habit.id);
  const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name;

  const stats = useHabitStats({
    habitId: habit.id,
    period: habit.period,
    createdAt: habit.createdAt,
    referenceDate: new Date(),
    skippedPeriods: habit.skippedPeriods,
    activeDays: habit.activeDays,
    enabled: !editing,
  });
  const percent = completionPercent(stats);

  async function handleDelete() {
    const repos = getHabitRepos(habit.id);
    if (!repos) return;
    try {
      await repos.habit.deleteHabit(habit.id);
    } catch {
      toast.error("Failed to delete habit. Please try again.");
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
        // Esc out of edit mode first, then out of the panel (DIRECTION §7).
        if (editing) setEditing(false);
        else onClose();
      }}
      title={editing ? `Edit “${habit.name}”` : habit.name}
      ariaLabel="Habit details"
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
              variant="ghost"
              className="mr-auto min-h-11"
              onPress={() => {
                form.reset();
                setEditing(true);
              }}
            >
              <Pencil width={16} height={16} />
              Edit
            </Button>
            {/* A habit's check-in history is the one thing in this app an undo
                toast cannot rebuild, so this is the object that confirms
                (DIRECTION §7). */}
            <ConfirmButton
              label="Delete habit"
              confirmLabel="Delete habit"
              hint="This also deletes every check-in recorded for it."
              variant="ghost"
              onConfirm={handleDelete}
            />
          </>
        )
      }
    >
      {editing ? (
        <HabitEditFields form={form} onSubmit={handleSave} />
      ) : (
        <div className="flex flex-col gap-5">
          <DetailFields>
            <DetailField label="Repeats">
              {habitCadenceLabel(habit.times, habit.period)}
            </DetailField>
            {habit.period === Period.DAY && (
              <DetailField label="Active days">
                {habit.activeDays && habit.activeDays.length > 0
                  ? habit.activeDays
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => DAY_NAMES[d])
                      .join(", ")
                  : "Every day"}
              </DetailField>
            )}
            <DetailField label="Time of day">
              {habit.timeOfDay ?? "Any time"}
            </DetailField>
            <DetailField label="Kept">
              {percent === null ? (
                "No closed periods yet"
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <span>
                    {percent}% of {stats?.periodsElapsed}{" "}
                    {habit.period === Period.DAY
                      ? "days"
                      : habit.period === Period.WEEK
                        ? "weeks"
                        : "months"}
                  </span>
                  {stats && stats.currentStrikeLength > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-streak-soft px-2 py-0.5 text-xs font-medium text-streak">
                      <Flame width={12} height={12} />
                      {stats.currentStrikeLength} streak
                    </span>
                  )}
                  {stats?.openSincePeriodKey && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-muted">
                      open since{" "}
                      {formatPeriodKey(stats.openSincePeriodKey, habit.period)}
                    </span>
                  )}
                </span>
              )}
            </DetailField>
            {workspaceName && (
              <DetailField label="Workspace">{workspaceName}</DetailField>
            )}
            <DetailField label="Started">
              {formatDate(habit.createdAt)}
            </DetailField>
          </DetailFields>

          <CommentSection
            target="habit"
            itemId={habit.id}
            itemName={habit.name}
            workspaceId={workspaceId}
            isOpen
          />
        </div>
      )}
    </DetailPanel>
  );
}
