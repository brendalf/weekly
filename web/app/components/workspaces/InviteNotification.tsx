"use client";

import { useState } from "react";
import { useWorkspaceStore } from "../../stores/workspace";
import { workspaceRepository } from "../../repositories";
import { auth } from "../../config/firebase";

export function InviteNotification() {
  const [open, setOpen] = useState(false);
  const pendingInvites = useWorkspaceStore((s) => s.pendingInvites);

  if (pendingInvites.length === 0) return null;

  async function handleRespond(inviteId: string, accept: boolean) {
    const user = auth.currentUser;
    if (!user?.email) return;
    await workspaceRepository.respondToInvite(
      user.uid,
      user.email,
      user.displayName ?? "User",
      inviteId,
      accept,
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:border-border-strong transition-colors"
        aria-label={`${pendingInvites.length} pending invite${pendingInvites.length > 1 ? "s" : ""}`}
      >
        <span className="text-xs">✉</span>
        <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand text-xs leading-none text-brand-foreground font-bold">
          {pendingInvites.length}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-border bg-surface p-2 shadow-lg">
            <p className="mb-2 px-2 text-xs font-medium text-muted">
              Workspace Invites
            </p>
            <div className="flex flex-col gap-1">
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
                    <button
                      onClick={() => handleRespond(invite.id, true)}
                      className="flex-1 rounded-lg bg-brand py-1 text-xs text-brand-foreground hover:bg-brand-hover transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(invite.id, false)}
                      className="flex-1 rounded-lg border border-border-strong py-1 text-xs text-muted hover:bg-fill transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
