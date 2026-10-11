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
        "flex h-3 w-3 shrink-0 items-center justify-center rounded border",
        checked ? "border-primary bg-primary text-white" : "border-foreground/30",
      ].join(" ")}
    >
      {checked && <span className="text-[8px] leading-none">✓</span>}
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
      <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-surface px-3 py-1 text-xs font-medium text-foreground/40">
        Setting up…
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-purple-500 bg-surface px-3 py-1 text-xs font-medium text-primary hover:bg-foreground/5 transition-colors cursor-pointer"
      >
        {showHouseIconInButton && <House width={12} height={12} />}
        {buttonLabel}
      </button>

      {singleWorkspace && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="cursor-pointer text-foreground/40 hover:text-foreground/70 transition-colors"
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
          <div className="absolute left-0 top-full z-20 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-foreground/10 bg-surface p-1 shadow-lg">
            {multiWorkspace && (
              <button
                onClick={() => workspaceStore.selectAllWorkspaces()}
                className={[
                  "flex w-full min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors",
                  selection.isAll ? "text-primary font-medium" : "text-foreground",
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
                  className="group flex items-center rounded-lg hover:bg-foreground/5 transition-colors"
                >
                  <button
                    onClick={() => workspaceStore.toggleWorkspaceSelection(workspace.id)}
                    className={[
                      "flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs",
                      checked ? "text-foreground" : "text-foreground/60",
                    ].join(" ")}
                  >
                    <CheckboxMark checked={checked} />
                    <span className="truncate">{workspace.name}</span>
                  </button>
                  {multiWorkspace && (
                    <button
                      onClick={() => workspaceStore.selectOnlyWorkspace(workspace.id)}
                      className="mr-1 shrink-0 cursor-pointer rounded-md px-2 py-2 text-[10px] uppercase tracking-wide text-foreground/40 opacity-100 transition-colors hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      aria-label={`Show only ${workspace.name}`}
                    >
                      only
                    </button>
                  )}
                </div>
              );
            })}

            <div className="my-1 border-t border-foreground/10" />

            <button
              onClick={handleNewWorkspace}
              className="flex w-full min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors"
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
