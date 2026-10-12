"use client";

import { useState } from "react";
import { Button, Switch } from "@heroui/react";
import { Plus } from "@gravity-ui/icons";
import type { Workspace } from "@weekly/domain";
import { useAppData } from "../../components/shell/AppDataProvider";
import { ThemeToggleButton } from "../../components/general/ThemeToggleButton";
import { WorkspaceSettingsModal } from "../../components/workspaces/WorkspaceSettingsModal";
import { CreateWorkspaceModal } from "../../components/workspaces/CreateWorkspaceModal";

/**
 * `/app/settings` — account, display, workspaces (DIRECTION §3).
 *
 * The two display toggles are real preferences and stay (DIRECTION §2.5 allows
 * the ones that already exist); the `layout` / `innerLayout` matrix that used to
 * sit beside them is gone, so there is one layout per route.
 *
 * **TODO (WS9):** fold `WorkspaceSettingsModal` and `CreateWorkspaceModal` into
 * this page as real sections — rename, members, invites, leave/delete inline
 * instead of behind a modal.
 */
export default function SettingsPage() {
  const {
    user,
    userId,
    workspaces,
    showCompletedTasks,
    showSkippedHabits,
    setShowCompletedTasks,
    setShowSkippedHabits,
    logout,
  } = useAppData();

  const [manageWorkspace, setManageWorkspace] = useState<Workspace | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Section title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.displayName ?? "Signed in"}
            </p>
            <p className="truncate text-xs text-muted">{user?.email ?? ""}</p>
          </div>
          <Button
            variant="outline"
            className="min-h-11"
            onPress={() => {
              logout();
            }}
          >
            Sign out
          </Button>
        </div>
      </Section>

      <Section title="Display">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">Theme</p>
              <p className="text-xs text-muted">
                Follows you across devices once saved.
              </p>
            </div>
            {userId && <ThemeToggleButton userId={userId} />}
          </div>

          <PreferenceSwitch
            label="Show completed"
            hint="Keep finished tasks and habits in the lists."
            isSelected={showCompletedTasks}
            onChange={setShowCompletedTasks}
          />
          <PreferenceSwitch
            label="Show skipped habits"
            hint="Keep habits you skipped visible for the period."
            isSelected={showSkippedHabits}
            onChange={setShowSkippedHabits}
          />
        </div>
      </Section>

      <Section title="Workspaces">
        <div className="flex flex-col gap-2">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  {workspace.name}
                </p>
                <p className="text-xs text-subtle">
                  {workspace.members.length === 1
                    ? "Just you"
                    : `${workspace.members.length} members`}
                  {workspace.pendingInviteEmails.length > 0 &&
                    ` · ${workspace.pendingInviteEmails.length} invited`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11"
                onPress={() => setManageWorkspace(workspace)}
              >
                Manage
              </Button>
            </div>
          ))}

          <Button
            size="sm"
            variant="outline"
            className="min-h-11 w-fit"
            onPress={() => setCreateOpen(true)}
          >
            <Plus width={16} height={16} />
            New workspace
          </Button>
        </div>
      </Section>

      {manageWorkspace && (
        <WorkspaceSettingsModal
          open
          onOpenChange={(open) => {
            if (!open) setManageWorkspace(null);
          }}
          workspace={manageWorkspace}
        />
      )}
      <CreateWorkspaceModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function PreferenceSwitch({
  label,
  hint,
  isSelected,
  onChange,
}: {
  label: string;
  hint: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      className="flex min-h-11 w-full items-center justify-between gap-3"
    >
      <Switch.Content>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </Switch.Content>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}
