"use client";

import type { Period, ScopeProgress } from "@weekly/domain";
import { focusRing } from "../ui";

/**
 * Which cadence of the week's plan is on screen.
 *
 * Not a time range — the week in view is set once, in `WeekHeader`, and these
 * never change it. They choose between the three kinds of commitment a week
 * holds: things you do weekly, things you do on the selected day, things you
 * do monthly. Week leads and is the default (`WEEK_SCOPES`); the day is a
 * drill-down inside the week, never a peer to it (DIRECTION §1).
 *
 * Each segment carries its own ring, so the answer to "where am I" is visible
 * for all three without switching.
 */
export function ScopeTabs({
  scope,
  progress,
  onScopeChange,
}: {
  scope: Period;
  /** One entry per scope, in `WEEK_SCOPES` order. */
  progress: ScopeProgress[];
  onScopeChange: (period: Period) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Plan scope"
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-fill p-0.5"
    >
      {progress.map(({ period, label, done, total }) => {
        const isActive = scope === period;
        return (
          <button
            key={period}
            type="button"
            aria-pressed={isActive}
            onClick={() => onScopeChange(period)}
            className={[
              "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors sm:px-3",
              focusRing,
              isActive
                ? "bg-background text-foreground"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
            {total > 0 && (
              <>
                <ProgressRing done={done} total={total} />
                {/* Three segments plus three counts overflow a 375px row once
                    the numbers reach two digits, so below `sm:` the ring
                    carries the value visually and the count stays for screen
                    readers. */}
                <span className="sr-only text-xs tabular-nums text-subtle sm:not-sr-only">
                  {done}/{total}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only done/total ring. Decorative — the count beside it carries the value. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 16;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = done >= total;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
        className="stroke-fill-strong"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, done / total))}
        className={`transition-[stroke-dashoffset] ${
          complete ? "stroke-brand" : "stroke-brand-border"
        }`}
      />
    </svg>
  );
}
