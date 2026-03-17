"use client";

import { useState } from "react";
import { useProjectStore } from "../../stores/project";
import { projectRepository } from "../../repositories";
import { auth } from "../../config/firebase";

export function InviteNotification() {
  const [open, setOpen] = useState(false);
  const pendingInvites = useProjectStore((s) => s.pendingInvites);

  if (pendingInvites.length === 0) return null;

  async function handleRespond(inviteId: string, accept: boolean) {
    const user = auth.currentUser;
    if (!user?.email) return;
    await projectRepository.respondToInvite(
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
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-foreground/20 bg-surface hover:border-foreground/40 transition-colors"
        aria-label={`${pendingInvites.length} pending invite${pendingInvites.length > 1 ? "s" : ""}`}
      >
        <span className="text-xs">✉</span>
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white font-bold">
          {pendingInvites.length}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-foreground/10 bg-surface p-2 shadow-lg">
            <p className="mb-2 px-2 text-xs font-medium text-foreground/60">
              Project Invites
            </p>
            <div className="flex flex-col gap-1">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-2 rounded-lg border border-foreground/10 bg-background p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {invite.projectName}
                    </p>
                    <p className="text-xs text-foreground/60">
                      from {invite.invitedByDisplayName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(invite.id, true)}
                      className="flex-1 rounded-lg bg-purple-500 py-1 text-xs text-white hover:bg-purple-600 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(invite.id, false)}
                      className="flex-1 rounded-lg border border-foreground/20 py-1 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors"
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
