"use client";

import { useState } from "react";
import { House, Plus, Gear } from "@gravity-ui/icons";
import {
  useWorkspaceSelection,
  useWorkspaceStore,
  workspaceStore,
} from "../../stores/workspace";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

/** Small square checkbox, matching the one in HabitsTasksView's layout menu. */
function CheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
        checked ? "border-brand bg-brand text-brand-foreground" : "border-border-strong",
      ].join(" ")}
    >
      {checked && <span className="text-xs leading-none">✓</span>}
    </span>
  );
}

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selection = useWorkspaceSelection();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const multiWorkspace = workspaces.length > 1;
  const singleWorkspace = selection.singleId
    ? (workspaces.find((w) => w.id === selection.singleId) ?? null)
    : null;

  const buttonLabel = singleWorkspace
    ? singleWorkspace.name
    : selection.isAll
      ? "All workspaces"
      : `${selection.workspaceIds.length} workspaces`;
  const showHouseIconInButton = !singleWorkspace && selection.isAll;

  function handleNewWorkspace() {
    setDropdownOpen(false);
    setCreateOpen(true);
  }

  if (workspaces.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-subtle">
        Setting up…
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-brand bg-surface px-3 py-1 text-xs font-medium text-brand-muted hover:bg-fill transition-colors cursor-pointer"
      >
        {showHouseIconInButton && <House width={12} height={12} />}
        {buttonLabel}
      </button>

      {singleWorkspace && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="cursor-pointer text-subtle hover:text-muted transition-colors"
          aria-label="Workspace settings"
        >
          <Gear width={14} height={14} />
        </button>
      )}

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-1 shadow-lg">
            {multiWorkspace && (
              <button
                onClick={() => workspaceStore.selectAllWorkspaces()}
                className={[
                  "flex w-full min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-fill transition-colors",
                  selection.isAll ? "text-brand-muted font-medium" : "text-foreground",
                ].join(" ")}
              >
                <CheckboxMark checked={selection.isAll} />
                <House width={12} height={12} className="shrink-0" />
                All workspaces
              </button>
            )}

            {workspaces.map((workspace) => {
              const checked = selection.workspaceIds.includes(workspace.id);
              return (
                <div
                  key={workspace.id}
                  className="group flex items-center rounded-lg hover:bg-fill transition-colors"
                >
                  <button
                    onClick={() => workspaceStore.toggleWorkspaceSelection(workspace.id)}
                    className={[
                      "flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs",
                      checked ? "text-foreground" : "text-muted",
                    ].join(" ")}
                  >
                    <CheckboxMark checked={checked} />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                  {multiWorkspace && (
                    <button
                      onClick={() => workspaceStore.selectOnlyWorkspace(workspace.id)}
                      className="mr-1 shrink-0 cursor-pointer rounded-md px-2 py-2 text-xs uppercase tracking-wide text-subtle opacity-100 transition-colors hover:text-brand-muted sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      aria-label={`Show only ${workspace.name}`}
                    >
                      only
                    </button>
                  )}
                </div>
              );
            })}

            <div className="my-1 border-t border-border" />

            <button
              onClick={handleNewWorkspace}
              className="flex w-full min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted hover:bg-fill transition-colors"
            >
              <Plus width={12} height={12} />
              New workspace
            </button>
          </div>
        </>
      )}

      {singleWorkspace && (
        <WorkspaceSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workspace={singleWorkspace}
        />
      )}

      <CreateWorkspaceModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
