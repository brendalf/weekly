"use client";

import { useState } from "react";
import { House, Plus, Gear } from "@gravity-ui/icons";
import { useWorkspaceStore, workspaceStore } from "../../stores/workspace";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const multiWorkspace = workspaces.length > 1;

  const buttonLabel = activeWorkspace?.name ?? "All Workspaces";
  const showHouseIconInButton = activeWorkspaceId === null;

  function handleNewWorkspace() {
    setDropdownOpen(false);
    setCreateOpen(true);
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-purple-500 bg-surface px-3 py-1 text-xs font-medium text-primary hover:bg-foreground/5 transition-colors cursor-pointer"
      >
        {showHouseIconInButton && <House width={12} height={12} />}
        {buttonLabel}
      </button>

      {activeWorkspaceId && activeWorkspace && (
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
          <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-foreground/10 bg-surface p-1 shadow-lg">
            {multiWorkspace && (
              <button
                onClick={() => {
                  workspaceStore.setActiveWorkspace(null);
                  setDropdownOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors cursor-pointer",
                  activeWorkspaceId === null
                    ? "text-purple-500 font-medium"
                    : "text-foreground",
                ].join(" ")}
              >
                <House width={12} height={12} />
                All Workspaces
              </button>
            )}

            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => {
                  workspaceStore.setActiveWorkspace(workspace.id);
                  setDropdownOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors cursor-pointer",
                  activeWorkspaceId === workspace.id
                    ? "text-purple-500 font-medium"
                    : "text-foreground",
                ].join(" ")}
              >
                {workspace.name}
              </button>
            ))}

            <div className="my-1 border-t border-foreground/10" />

            <button
              onClick={handleNewWorkspace}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors cursor-pointer"
            >
              <Plus width={12} height={12} />
              New workspace
            </button>
          </div>
        </>
      )}

      {activeWorkspaceId && activeWorkspace && (
        <WorkspaceSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workspace={activeWorkspace}
        />
      )}

      <CreateWorkspaceModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
