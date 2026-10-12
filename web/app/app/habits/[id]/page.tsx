"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@heroui/react";
import { Period } from "@weekly/domain";
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
 * **TODO (WS5):** move `HabitDetailsModal`'s body in here — the 84-day history
 * calendar, the +/− progress control, the edit form, the comment thread — and
 * delete the modal along with `HabitItem`'s fallback branch. This panel
 * deliberately carries only the facts plus the confirmed delete, so WS3 does
 * not pre-empt the per-route design work.
 */
export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { habits, workspaces, workspacesLoaded } = useAppData();
  const { getHabitRepos, getHabitProjectId } = useRepositoryContext();

  const habit = habits.find((h) => h.id === id) ?? null;
  const workspaceName = workspaces.find(
    (w) => w.id === getHabitProjectId(id),
  )?.name;

  function close() {
    // `push`, not `back()`: a visitor who opened the deep link directly has no
    // history entry to return to.
    router.push("/app/habits");
  }

  async function handleDelete() {
    const repos = getHabitRepos(id);
    if (!repos) return;
    try {
      await repos.habit.deleteHabit(id);
    } catch {
      toast.error("Failed to delete habit. Please try again.");
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
      title={habit?.name ?? "Habit"}
      ariaLabel="Habit details"
      footer={
        habit && (
          <ConfirmButton
            label="Delete habit"
            confirmLabel="Delete habit"
            hint="This also deletes every check-in recorded for it."
            onConfirm={handleDelete}
          />
        )
      }
    >
      {habit ? (
        <DetailFields>
          <DetailField label="Repeats">
            {habit.times}× per {habit.period}
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
          {workspaceName && (
            <DetailField label="Workspace">{workspaceName}</DetailField>
          )}
          <DetailField label="Started">{formatDate(habit.createdAt)}</DetailField>
        </DetailFields>
      ) : workspacesLoaded ? (
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
