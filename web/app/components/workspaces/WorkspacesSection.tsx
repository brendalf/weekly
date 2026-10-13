"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus, TrashBin } from "@gravity-ui/icons";
import { toast } from "sonner";
import type { Workspace } from "@weekly/domain";
import { Collapsible, ConfirmButton } from "../ui";
import { Badge } from "../general/Badge";
import { workspaceRepository } from "../../repositories";
import { workspaceStore } from "../../stores/workspace";

/**
 * Workspace administration, **inline on `/app/settings`** (PLAN WS9).
 *
 * This is `WorkspaceSettingsModal` + `CreateWorkspaceModal` folded into the
 * page that the nav already promises will hold them. A settings page reached
 * through a nav item that immediately opens a modal to do its actual work is
 * two surfaces where one would do, and the modal version also broke two rules
 * of its own: its only destructive control was a bare red trash glyph
 * (DIRECTION §6.7), and it fired instantly with no confirmation (§2.4) —
 * deleting the single most destructive thing in the product.
 *
 * Here, every workspace is a section you can open in place, and both
 * destructive actions go through `ConfirmButton`'s two-step with a line naming
 * exactly what is lost.
 *
 * Mutations go through `workspaceRepository` (the port implementation exported
 * from `app/repositories`), never Firestore directly — same as
 * `useActivityLog` and `NotificationBell`.
 */

/** Members are stored as uids; there is no directory to resolve them against. */
function memberLabel(memberId: string, currentUserId: string | null): string {
  if (memberId === currentUserId) return "You";
  return `Member ${memberId.slice(0, 6)}…`;
}

function membersLine(workspace: Workspace): string {
  const members =
    workspace.members.length === 1
      ? "Just you"
      : `${workspace.members.length} members`;
  const invited = workspace.pendingInviteEmails.length;
  return invited > 0 ? `${members} · ${invited} invited` : members;
}

export interface WorkspacesSectionProps {
  workspaces: Workspace[];
  /** The signed-in user's uid, or `null` before auth resolves. */
  userId: string | null;
  /** Shown to the invitee as who invited them. */
  userDisplayName: string;
}

export function WorkspacesSection({
  workspaces,
  userId,
  userDisplayName,
}: WorkspacesSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          userId={userId}
          userDisplayName={userDisplayName}
          isOnlyWorkspace={workspaces.length === 1}
          defaultOpen={workspaces.length === 1}
        />
      ))}
      <CreateWorkspaceForm userId={userId} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* One workspace                                                              */
/* -------------------------------------------------------------------------- */

function WorkspaceCard({
  workspace,
  userId,
  userDisplayName,
  isOnlyWorkspace,
  defaultOpen,
}: {
  workspace: Workspace;
  userId: string | null;
  userDisplayName: string;
  isOnlyWorkspace: boolean;
  defaultOpen: boolean;
}) {
  const isOwner = userId !== null && userId === workspace.ownerId;
  const [name, setName] = useState(workspace.name);
  const [renaming, setRenaming] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const renamed = name.trim() !== workspace.name && name.trim().length > 0;

  async function handleRename() {
    if (!renamed || renaming) return;
    setRenaming(true);
    try {
      await workspaceRepository.renameWorkspace(workspace.id, name.trim());
      toast.success("Workspace renamed");
    } catch {
      toast.error("Could not rename the workspace. Please try again.");
    } finally {
      setRenaming(false);
    }
  }

  async function handleInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !userId || inviting) return;
    setInviting(true);
    try {
      await workspaceRepository.inviteMember(
        workspace.id,
        userId,
        userDisplayName,
        email,
      );
      setInviteEmail("");
      toast.success(`Invited ${email}`);
    } catch {
      toast.error("Could not send the invite. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  function handleRemoveMember(memberId: string) {
    workspaceRepository.removeMember(workspace.id, memberId).catch(() => {
      toast.error("Could not remove that member. Please try again.");
    });
  }

  function handleLeave() {
    if (!userId) return;
    workspaceRepository
      .removeMember(workspace.id, userId)
      .then(() => {
        workspaceStore.selectAllWorkspaces();
        toast.success(`You left ${workspace.name}`);
      })
      .catch(() => toast.error("Could not leave the workspace."));
  }

  function handleDelete() {
    workspaceRepository
      .deleteWorkspace(workspace.id)
      .then(() => {
        workspaceStore.selectAllWorkspaces();
        toast.success(`Deleted ${workspace.name}`);
      })
      .catch(() => toast.error("Could not delete the workspace."));
  }

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <Collapsible
        label={workspace.name}
        count={membersLine(workspace)}
        defaultCollapsed={!defaultOpen}
        storageKey={`settings:workspace:${workspace.id}`}
        bodyClassName="flex flex-col gap-5 pt-3 pb-1"
      >
        {/* ------------------------------------------------------- rename -- */}
        {isOwner ? (
          <div className="flex flex-wrap items-end gap-2">
            <TextField name={`name-${workspace.id}`} className="min-w-48 flex-1">
              <Label>Name</Label>
              <Input
                value={name}
                variant="secondary"
                // HeroUI's input slot is `text-base sm:text-sm`; the scale is
                // locked at `text-base` for every input (DIRECTION §6.3).
                className="text-base sm:text-base"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
              />
            </TextField>
            <Button
              variant="outline"
              className="min-h-11"
              isDisabled={!renamed || renaming}
              onPress={handleRename}
            >
              Save name
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Only the owner can rename this workspace.
          </p>
        )}

        {/* ------------------------------------------------------ members -- */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Members</h3>
          <ul className="flex flex-col gap-1">
            {workspace.members.map((memberId) => (
              <li
                key={memberId}
                className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm text-foreground">
                    {memberLabel(memberId, userId)}
                  </span>
                  {memberId === workspace.ownerId && (
                    <Badge className="bg-brand-soft text-brand-muted">
                      owner
                    </Badge>
                  )}
                </span>
                {isOwner && memberId !== userId && (
                  <ConfirmButton
                    label="Remove"
                    confirmLabel="Remove member"
                    variant="ghost"
                    hint="They lose access to this workspace immediately."
                    onConfirm={() => handleRemoveMember(memberId)}
                  />
                )}
              </li>
            ))}
          </ul>

          {workspace.pendingInviteEmails.length > 0 && (
            <>
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Pending invites
              </h3>
              <ul className="flex flex-col gap-1">
                {workspace.pendingInviteEmails.map((email) => (
                  <li
                    key={email}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5"
                  >
                    <span className="truncate text-sm text-foreground">
                      {email}
                    </span>
                    <Badge className="bg-fill-strong text-subtle">
                      pending
                    </Badge>
                  </li>
                ))}
              </ul>
              {/* Revoking an invite would have to delete a doc under the
                  invitee's own email, which the Firestore rules only let the
                  invitee touch. Left out rather than shipped as a button that
                  fails. */}
              <p className="text-xs text-subtle">
                An invite disappears once the person accepts or declines it.
              </p>
            </>
          )}

          {isOwner && (
            <form
              className="mt-1 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleInvite();
              }}
            >
              <TextField
                name={`invite-${workspace.id}`}
                className="min-w-48 flex-1"
              >
                <Label>Invite by email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  variant="secondary"
                  placeholder="person@example.com"
                  className="text-base sm:text-base"
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </TextField>
              <Button
                type="submit"
                variant="outline"
                className="min-h-11"
                isDisabled={!inviteEmail.trim() || inviting}
              >
                Send invite
              </Button>
            </form>
          )}
        </div>

        {/* -------------------------------------------------- leave/delete -- */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          {isOwner ? (
            isOnlyWorkspace ? (
              <p className="mr-auto text-xs text-subtle">
                This is your only workspace, so it cannot be deleted. Create
                another one first.
              </p>
            ) : (
              <ConfirmButton
                label="Delete workspace"
                confirmLabel="Delete it permanently"
                icon={<TrashBin width={16} height={16} />}
                hint={`Deletes ${workspace.name} for everyone, with every habit, task, note and all their history. This cannot be undone.`}
                onConfirm={handleDelete}
              />
            )
          ) : (
            <ConfirmButton
              label="Leave workspace"
              confirmLabel="Leave it"
              hint={`You lose access to ${workspace.name}. Its habits, tasks and notes stay with the other members.`}
              onConfirm={handleLeave}
            />
          )}
        </div>
      </Collapsible>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* New workspace                                                              */
/* -------------------------------------------------------------------------- */

function CreateWorkspaceForm({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || !userId || creating) return;
    setCreating(true);
    try {
      const workspaceId = await workspaceRepository.createWorkspace(
        userId,
        trimmed,
      );
      workspaceStore.selectOnlyWorkspace(workspaceId);
      setName("");
      setOpen(false);
      toast.success(`Created ${trimmed}`);
    } catch {
      toast.error("Could not create the workspace. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="min-h-11 w-fit"
        onPress={() => setOpen(true)}
      >
        <Plus width={16} height={16} />
        New workspace
      </Button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
    >
      <TextField name="newWorkspace" className="min-w-48 flex-1">
        <Label>Workspace name</Label>
        <Input
          value={name}
          variant="secondary"
          placeholder="e.g. Work"
          autoFocus
          className="text-base sm:text-base"
          onChange={(e) => setName(e.target.value)}
        />
      </TextField>
      <Button
        variant="ghost"
        className="min-h-11"
        onPress={() => {
          setName("");
          setOpen(false);
        }}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        className="min-h-11 bg-brand text-brand-foreground"
        isDisabled={!name.trim() || creating}
      >
        Create workspace
      </Button>
    </form>
  );
}
