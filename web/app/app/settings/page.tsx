"use client";

import { Button, Switch } from "@heroui/react";
import { useAppData } from "../../components/shell/AppDataProvider";
import { ThemeToggleButton } from "../../components/general/ThemeToggleButton";
import { WorkspacesSection } from "../../components/workspaces/WorkspacesSection";

/**
 * `/app/settings` — account, display, workspaces (DIRECTION §3).
 *
 * The two display toggles are real preferences and stay (DIRECTION §2.5 allows
 * the ones that already exist); the `layout` / `innerLayout` matrix that used to
 * sit beside them is gone, so there is one layout per route.
 *
 * Workspace administration is **on the page**, not behind a modal (WS9): a
 * settings route whose first act is to open a dialog has not actually moved
 * anything into settings. `WorkspaceSettingsModal` and `CreateWorkspaceModal`
 * are gone; `WorkspacesSection` is what replaced them, and the workspace
 * switcher's gear now links here.
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
        <WorkspacesSection
          workspaces={workspaces}
          userId={userId}
          userDisplayName={user?.displayName ?? "A teammate"}
        />
      </Section>
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
