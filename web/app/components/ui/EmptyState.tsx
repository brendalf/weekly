"use client";

import type { ReactNode } from "react";

/**
 * The empty state every list route owes its user (DIRECTION §7).
 *
 * Today a new user is told `No habits yet.` in 12px at 60% opacity — a dead
 * end. An empty state is an invitation: say what this list is *for* in one
 * line, then offer the one action that fills it.
 *
 * HeroUI ships an `EmptyState`, but in this beta it is a bare
 * `p-2 text-sm text-muted` div with no icon, headline, or action slot, so this
 * is built from the tokens directly.
 */
export interface EmptyStateProps {
  /** Headline: what is missing, in a few words. "No habits yet". */
  headline: string;
  /**
   * One line explaining what this list is for — not a restatement of the
   * headline. Keep it to a single sentence.
   */
  body?: string;
  /** Icon element, rendered ~20px inside a soft brand circle. */
  icon?: ReactNode;
  /** The primary action — usually one `Button`. */
  action?: ReactNode;
  /** Extra classes on the wrapper. */
  className?: string;
}

export function EmptyState({
  headline,
  body,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center ${
        className ?? ""
      }`}
    >
      {icon && (
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-muted"
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{headline}</p>
        {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
      </div>
      {action}
    </div>
  );
}
