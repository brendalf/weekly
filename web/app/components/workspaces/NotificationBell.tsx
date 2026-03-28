"use client";

import React, { useState, useRef } from "react";
import { Bell, BellDot } from "@gravity-ui/icons";
import { toast } from "sonner";
import { useWorkspaceStore, workspaceStore } from "../../stores/workspace";
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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const pendingInvites = useWorkspaceStore((s) => s.pendingInvites);
  const activityNotifications = useWorkspaceStore((s) => s.activityNotifications);
  const lastReadAt = useWorkspaceStore((s) => s.lastNotificationReadAt);

  const unreadCount =
    pendingInvites.length +
    activityNotifications.filter(
      (a) => !lastReadAt || a.createdAt > lastReadAt,
    ).length;

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const margin = 16;
      const top = rect.bottom + 4;
      const rightEdge = rect.right;
      const leftEdge = rightEdge - dropdownWidth;
      const style: React.CSSProperties = {
        position: "fixed",
        top,
        width: Math.min(dropdownWidth, window.innerWidth - margin * 2),
      };
      if (leftEdge < margin) {
        style.left = margin;
      } else {
        style.right = window.innerWidth - rightEdge;
      }
      setDropdownStyle(style);
    }
    setOpen(true);
    const ts = new Date().toISOString();
    workspaceStore.setLastNotificationReadAt(ts);
    const user = auth.currentUser;
    if (user) {
      userPreferencesRepository.updateLastNotificationReadAt(user.uid, ts);
    }
  }

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
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-foreground/20 bg-surface hover:border-foreground/40 transition-colors"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
        }
      >
        {unreadCount > 0 ? (
          <BellDot width={16} height={16} />
        ) : (
          <Bell width={16} height={16} />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div style={dropdownStyle} className="z-20 rounded-xl border border-foreground/10 bg-surface p-2 shadow-lg">
            <p className="mb-2 px-2 text-xs font-medium text-foreground/60">
              Notifications
            </p>

            {!hasNotifications && (
              <p className="px-2 py-4 text-center text-xs text-foreground/40">
                No notifications
              </p>
            )}

            {pendingInvites.length > 0 && (
              <div className="flex flex-col gap-1 mb-2">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
                  Invites
                </p>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex cursor-pointer flex-col gap-2 rounded-lg border border-foreground/10 bg-background p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {invite.workspaceName}
                      </p>
                      <p className="text-xs text-foreground/60">
                        from {invite.invitedByDisplayName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(invite.id, true)}
                        className="flex-1 cursor-pointer rounded-lg bg-purple-500 py-1 text-xs text-white hover:bg-purple-600 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(invite.id, false)}
                        className="flex-1 cursor-pointer rounded-lg border border-foreground/20 py-1 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activityNotifications.length > 0 && (
              <div className="flex flex-col gap-1">
                {pendingInvites.length > 0 && (
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
                    Activity
                  </p>
                )}
                {activityNotifications.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 rounded-lg border border-foreground/10 bg-background p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">
                          {activity.actorDisplayName}
                        </span>{" "}
                        {activity.type === "habit_completed" && <>completed habit <span className="font-medium">{activity.itemName}</span></>}
                        {activity.type === "task_completed" && <>finished task <span className="font-medium">{activity.itemName}</span></>}
                        {activity.type === "habit_added" && <>added habit <span className="font-medium">{activity.itemName}</span></>}
                        {activity.type === "task_added" && <>added task <span className="font-medium">{activity.itemName}</span></>}
                        {activity.type === "note_added" && <>added a note <span className="font-medium">{activity.itemName}</span>{activity.weekKey ? <> for {activity.weekKey}</> : null}</>}
                        {activity.type === "note_edited" && <>edited note <span className="font-medium">{activity.itemName}</span></>}
                        {activity.type === "note_deleted" && <>deleted note <span className="font-medium">{activity.itemName}</span></>}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-foreground/40">
                      {relativeTime(activity.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
