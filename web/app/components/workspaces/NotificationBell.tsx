"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Bell, BellDot } from "@gravity-ui/icons";
import { toast } from "sonner";
import {
  buildActivityFeed,
  formatHabitMarkDetail,
  isHabitMarkActivity,
  type ActivityFeedEntry,
  type ActivityNotification,
} from "@weekly/domain";
import { useWorkspaceStore, workspaceStore } from "../../stores/workspace";
import { ActionPopover } from "../ui";
import { workspaceRepository, userPreferencesRepository } from "../../repositories";
import { auth } from "../../config/firebase";

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ActivityText({ activity }: { activity: ActivityNotification }) {
  const name = <span className="font-medium">{activity.itemName}</span>;
  switch (activity.type) {
    case "habit_completed":
      return <>completed habit {name}</>;
    case "habit_progress":
      return <>marked habit {name}</>;
    case "task_completed":
      return <>finished task {name}</>;
    case "habit_added":
      return <>added habit {name}</>;
    case "task_added":
      return <>added task {name}</>;
    case "note_added":
      return (
        <>
          added a note {name}
          {activity.weekKey ? <> for {activity.weekKey}</> : null}
        </>
      );
    case "note_edited":
      return <>edited note {name}</>;
    case "note_deleted":
      return <>deleted note {name}</>;
    case "comment_added":
      return (
        <>
          commented on {activity.commentTarget ?? "item"} {name}
        </>
      );
  }
}

function ActivityRow({
  entry,
  workspaceName,
  unread,
}: {
  entry: ActivityFeedEntry;
  workspaceName?: string;
  unread: boolean;
}) {
  const { activity } = entry;
  const detail = isHabitMarkActivity(activity.type)
    ? formatHabitMarkDetail(entry)
    : null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3">
      {unread && (
        <span
          aria-hidden
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground">
          <span className="font-medium">{activity.actorDisplayName}</span>{" "}
          <ActivityText activity={activity} />
        </p>
        {detail && (
          <p className="mt-0.5 text-xs text-subtle">{detail}</p>
        )}
        {activity.type === "comment_added" && activity.commentBody && (
          <p className="mt-1 border-l-2 border-border pl-2 text-xs break-words text-muted">
            {activity.commentBody}
          </p>
        )}
        {workspaceName && (
          <p className="mt-0.5 text-xs text-subtle">
            {workspaceName}
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs text-subtle">
        {relativeTime(activity.createdAt)}
      </span>
    </div>
  );
}

/**
 * The shell's notification affordance (DIRECTION §6.5, §6.8).
 *
 * WS14 rebuilt the shell around it. The trigger was a 32×32 `<button>` with no
 * focus ring, and the panel was a hand-measured `position: fixed` computed once
 * on open from `getBoundingClientRect` — so it did not reposition on scroll or
 * resize, it trapped no focus, it did not close on `Esc`, and nothing told a
 * screen reader it was expanded. It is an `ActionPopover` now (HeroUI/React
 * Aria): 44px trigger, focus ring, `aria-haspopup`/`aria-expanded`, focus
 * containment, `Esc`, collision detection and repositioning.
 *
 * `ActionPopover` rather than `ActionMenu` because the rows are not actions —
 * an invite row carries its own Accept/Decline pair, which a menu row cannot.
 */
export function NotificationBell() {
  const pendingInvites = useWorkspaceStore((s) => s.pendingInvites);
  const activityNotifications = useWorkspaceStore((s) => s.activityNotifications);
  const lastReadAt = useWorkspaceStore((s) => s.lastNotificationReadAt);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  // Opening marks everything read, so keep the pre-open cutoff to still mark
  // which rows are new in the panel the user is looking at.
  const [readCutoff, setReadCutoff] = useState<string | null>(null);

  const unreadCount =
    pendingInvites.length +
    activityNotifications.filter(
      (a) => !lastReadAt || a.createdAt > lastReadAt,
    ).length;

  const feed = useMemo(
    () => buildActivityFeed(activityNotifications),
    [activityNotifications],
  );

  // Workspace names only disambiguate when the feed can mix workspaces.
  const workspaceNames = useMemo(() => {
    if (workspaces.length < 2) return null;
    return new Map(workspaces.map((w) => [w.id, w.name]));
  }, [workspaces]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) return;
      setReadCutoff(lastReadAt);
      const ts = new Date().toISOString();
      workspaceStore.setLastNotificationReadAt(ts);
      const user = auth.currentUser;
      if (user) {
        userPreferencesRepository.updateLastNotificationReadAt(user.uid, ts);
      }
    },
    [lastReadAt],
  );

  async function handleRespond(inviteId: string, accept: boolean) {
    const user = auth.currentUser;
    if (!user?.email) return;
    try {
      await workspaceRepository.respondToInvite(
        user.uid,
        user.email,
        user.displayName ?? "User",
        inviteId,
        accept,
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const hasNotifications =
    pendingInvites.length > 0 || activityNotifications.length > 0;

  return (
    <ActionPopover
      label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      title="Notifications"
      className="w-80 max-w-[calc(100vw-2rem)]"
      triggerClassName="border border-border bg-surface text-muted hover:text-foreground"
      onOpenChange={handleOpenChange}
      trigger={
        <>
          {unreadCount > 0 ? (
            <BellDot width={16} height={16} aria-hidden />
          ) : (
            <Bell width={16} height={16} aria-hidden />
          )}
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-xs leading-none font-bold text-brand-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </>
      }
    >
      {!hasNotifications && (
        <p className="px-2 py-4 text-center text-xs text-muted">
          No notifications
        </p>
      )}

      {pendingInvites.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          <p className="px-2 text-xs font-semibold tracking-wide text-muted uppercase">
            Invites
          </p>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {invite.workspaceName}
                </p>
                <p className="text-xs text-muted">
                  from {invite.invitedByDisplayName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="min-h-11 flex-1"
                  onPress={() => handleRespond(invite.id, true)}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-11 flex-1 border border-border-strong"
                  onPress={() => handleRespond(invite.id, false)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {feed.length > 0 && (
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {pendingInvites.length > 0 && (
            <p className="px-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Activity
            </p>
          )}
          {feed.map((entry) => (
            <ActivityRow
              key={entry.key}
              entry={entry}
              workspaceName={
                workspaceNames?.get(entry.activity.workspaceId) ?? undefined
              }
              unread={!readCutoff || entry.activity.createdAt > readCutoff}
            />
          ))}
        </div>
      )}
    </ActionPopover>
  );
}
