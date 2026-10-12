"use client";

import type { ReactNode } from "react";
import { focusRing } from "../ui";

interface ToggleChipProps {
  /** What the chip turns on. Written as the state it produces, e.g. "Show completed". */
  label: ReactNode;
  /** Whether the chip is on. */
  isActive: boolean;
  onChange: (next: boolean) => void;
}

/**
 * A visible on/off chip for **display state** (PLAN WS11).
 *
 * `showCompleted` and `showSkipped` are not search and they are not
 * preferences-in-a-gear-popover: they change what the list in front of you
 * shows, so they belong next to the list, in a control whose state is readable
 * without opening anything (DIRECTION §4). They stay persisted — the chips
 * write through `useAppData()` to the same `UserPreferences` fields the popover
 * wrote to.
 *
 * `aria-pressed` rather than a checkbox: it is one button whose state is its
 * own label, which is also how a screen reader should hear it.
 */
export function ToggleChip({ label, isActive, onChange }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onChange(!isActive)}
      className={[
        "flex h-8 cursor-pointer items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors pointer-coarse:min-h-11",
        isActive
          ? "border-brand-border bg-brand-soft text-foreground hover:bg-brand-soft-hover"
          : "border-border text-muted hover:bg-fill hover:text-foreground",
        focusRing,
      ].join(" ")}
    >
      {label}
    </button>
  );
}
