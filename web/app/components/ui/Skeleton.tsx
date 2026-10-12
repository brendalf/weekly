"use client";

import { Skeleton as HeroSkeleton } from "@heroui/react";
import type { SkeletonProps as HeroSkeletonProps } from "@heroui/react";

/**
 * Loading placeholders, replacing the bare `Loading…` string in
 * `app/app/page.tsx` (DIRECTION §7).
 *
 * The point of a skeleton is that nothing moves when the data lands, so these
 * mirror the real rows exactly: `SkeletonRow` matches `HabitItem`/`TaskItem`
 * (28px ring, `gap-2`, `p-2`, `rounded-lg border border-border` → 44px tall) and
 * `SkeletonRow variant="note"` matches `NoteItem` (three stacked lines plus the
 * 44px pin column). Change a row's geometry and change its skeleton with it.
 *
 * Built on HeroUI's `Skeleton` (`.skeleton`, shimmer by default).
 */

export interface SkeletonProps {
  /** Geometry classes — `h-4 w-24`, `size-7 rounded-full`. */
  className?: string;
  /** Shimmer (default), pulse, or static. */
  animationType?: HeroSkeletonProps["animationType"];
}

/** A single placeholder box. Size it with `className`. */
export function Skeleton({ className, animationType }: SkeletonProps) {
  return (
    <HeroSkeleton
      animationType={animationType}
      className={`rounded-md ${className ?? ""}`}
    />
  );
}

export interface SkeletonRowProps {
  /**
   * Which row to imitate.
   * - `"item"` — a habit or task row: progress ring, title, trailing badge.
   * - `"note"` — a note row: title, preview, metadata, pin column.
   * @default "item"
   */
  variant?: "item" | "note";
  /** Extra classes on the row wrapper. */
  className?: string;
}

/** One list row at rest, matching the real row's box model so nothing jumps. */
export function SkeletonRow({ variant = "item", className }: SkeletonRowProps) {
  if (variant === "note") {
    return (
      <div
        aria-hidden
        className={`flex items-stretch rounded-lg border border-border bg-background ${
          className ?? ""
        }`}
      >
        <div className="flex min-h-11 flex-1 flex-col justify-center gap-1 px-3 py-2">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex w-11 shrink-0 items-center justify-center">
          <Skeleton className="size-4 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={`flex items-center gap-2 rounded-lg border border-border bg-background p-2 ${
        className ?? ""
      }`}
    >
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <Skeleton className="h-3.5 flex-1" />
      <Skeleton className="h-3.5 w-10 shrink-0" />
    </div>
  );
}

export interface SkeletonCardProps {
  /** How many placeholder rows sit inside the card. @default 3 */
  rows?: number;
  /** Row geometry inside the card. @default "item" */
  variant?: "item" | "note";
  /** Extra classes on the card wrapper. */
  className?: string;
}

/**
 * A section-sized placeholder: the uppercase section header plus its rows —
 * the shape of a `PeriodPanel` / `HabitList` / `TaskList` block.
 */
export function SkeletonCard({
  rows = 3,
  variant = "item",
  className,
}: SkeletonCardProps) {
  return (
    <div aria-hidden className={`flex flex-col gap-1 ${className ?? ""}`}>
      <Skeleton className="mb-1 h-3 w-20" />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} variant={variant} />
      ))}
    </div>
  );
}

export interface SkeletonListProps {
  /** How many rows to draw. @default 3 */
  count?: number;
  /** Row geometry. @default "item" */
  variant?: "item" | "note";
  /** Announced to screen readers while loading. @default "Loading" */
  label?: string;
  /** Extra classes on the list wrapper. */
  className?: string;
}

/**
 * A stack of `SkeletonRow`s with the live-region plumbing, so the wait is
 * announced once instead of being silent.
 */
export function SkeletonList({
  count = 3,
  variant = "item",
  label = "Loading",
  className,
}: SkeletonListProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`flex flex-col gap-0.5 ${className ?? ""}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} variant={variant} />
      ))}
    </div>
  );
}
