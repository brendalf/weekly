"use client";

import Link from "next/link";
import { Checkbox, Separator } from "@heroui/react";
import { House, Plus, Gear } from "@gravity-ui/icons";
import {
  useWorkspaceSelection,
  useWorkspaceStore,
  workspaceStore,
} from "../../stores/workspace";
import {
  ActionPopover,
  focusRing,
  touchRow,
  touchRowCoarse,
  touchTarget,
} from "../ui";

/**
 * Workspace context for the shell header: which workspaces the app is
 * currently showing, and a panel to change it.
 *
 * WS14 replaced two things here.
 *
 * 1. **The panel.** It was `absolute` + a `fixed inset-0` click-catcher div —
 *    no focus containment, no `Esc`, no collision detection, no reposition on
 *    scroll, and `aria-expanded` nowhere. It is now an `ActionPopover`
 *    (HeroUI/React Aria), which supplies all five. `ActionPopover` rather than
 *    `ActionMenu` because the rows are not actions: each carries a checkbox
 *    *and* a secondary "only" control, which a menu row cannot hold.
 * 2. **The checkboxes.** Each row drew its own 16px square with a
 *    `<span className="text-xs">✓</span>` inside — 16px of hit area, no
 *    `aria-checked`, no focus ring, no indeterminate state, no disabled state
 *    (DIRECTION §6.6). They are HeroUI `Checkbox`es now, so the row *is* the
 *    control: 44px tall, focus-ringed, and announced as a checkbox.
 */
export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selection = useWorkspaceSelection();

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

  if (workspaces.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
        Setting up…
      </span>
    );
  }

  return (
    <div className="inline-flex min-w-0 items-center gap-1">
      <ActionPopover
        label={`Workspaces — showing ${buttonLabel}`}
        title="Show"
        placement="bottom start"
        className="w-64 max-w-[calc(100vw-2rem)]"
        triggerClassName="min-w-0 border border-brand bg-surface px-3 text-xs font-medium text-brand-muted"
        trigger={
          <span className="flex min-w-0 items-center gap-2">
            {showHouseIconInButton && (
              <House width={12} height={12} aria-hidden className="shrink-0" />
            )}
            <span className="truncate">{buttonLabel}</span>
          </span>
        }
      >
        {multiWorkspace && (
          <Checkbox
            isSelected={selection.isAll}
            onChange={() => workspaceStore.selectAllWorkspaces()}
            className={`w-full gap-2 rounded-lg px-3 transition-colors hover:bg-fill ${touchRow} ${
              selection.isAll ? "font-medium text-brand-muted" : "text-foreground"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 text-xs">
              <House width={12} height={12} aria-hidden className="shrink-0" />
              All workspaces
            </span>
          </Checkbox>
        )}

        {workspaces.map((workspace) => {
          const checked = selection.workspaceIds.includes(workspace.id);
          return (
            <div
              key={workspace.id}
              className="group flex items-center rounded-lg transition-colors hover:bg-fill"
            >
              <Checkbox
                isSelected={checked}
                onChange={() =>
                  workspaceStore.toggleWorkspaceSelection(workspace.id)
                }
                className={`min-w-0 flex-1 gap-2 rounded-lg px-3 ${touchRow} ${
                  checked ? "text-foreground" : "text-muted"
                }`}
              >
                <span className="min-w-0 truncate text-xs">
                  {workspace.name}
                </span>
              </Checkbox>
              {multiWorkspace && (
                <button
                  type="button"
                  onClick={() =>
                    workspaceStore.selectOnlyWorkspace(workspace.id)
                  }
                  className={`mr-1 shrink-0 cursor-pointer rounded-md px-2 py-2 text-xs tracking-wide text-muted uppercase transition-colors hover:text-brand-muted sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${touchRowCoarse} ${focusRing}`}
                  aria-label={`Show only ${workspace.name}`}
                >
                  only
                </button>
              )}
            </div>
          );
        })}

        <Separator className="my-1" />

        <Link
          href="/app/settings"
          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-xs text-muted transition-colors hover:bg-fill ${touchRow} ${focusRing}`}
        >
          <Plus width={12} height={12} aria-hidden />
          New workspace
        </Link>
      </ActionPopover>

      {/* Workspace administration lives on `/app/settings` (WS9), so this is a
          link to it rather than a modal trigger — one place for one thing. */}
      <Link
        href="/app/settings"
        className={`flex shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground ${touchTarget} ${focusRing}`}
        aria-label="Workspace settings"
      >
        <Gear width={16} height={16} aria-hidden />
      </Link>
    </div>
  );
}
