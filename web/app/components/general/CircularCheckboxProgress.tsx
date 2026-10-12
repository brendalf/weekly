"use client";

import { Check } from "@gravity-ui/icons";
import { focusRing } from "../ui";

interface CircularCheckboxProgressProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  complete?: boolean;
  /**
   * Press handler. Fires **in the complete state too** — see
   * {@link CircularCheckboxProgress}. Omit it to render the ring read-only.
   */
  onClick?: () => void;
  ariaLabel?: string;
  /** Extra classes on the wrapper — z-index and layout belong to the caller. */
  className?: string;
}

/**
 * The completion ring.
 *
 * **It no longer disables itself when complete** (PLAN WS10 / DIRECTION §7).
 * It used to set `disabled={complete}`, which meant a mis-tap could only be
 * undone by opening the item's detail view and pressing `−`: the single most
 * common corrective action in the product cost four interactions. The ring is
 * now a toggle in both directions and the caller decides what a press means —
 * `HabitItem` increments while there is room and removes the most recent
 * check-in once the target is met.
 *
 * The ring is read-only only when no `onClick` is supplied (a skipped habit).
 *
 * On a coarse pointer the hit area grows to 44px through a transparent
 * `::after`, without changing the ring's drawn size (DIRECTION §6.8).
 */
export function CircularCheckboxProgress({
  size = 32,
  stroke = 3,
  progress,
  complete = false,
  onClick,
  ariaLabel,
  className,
}: CircularCheckboxProgressProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  const inner = size - stroke * 2 - 4;

  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      {/* SVG ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="var(--fill-strong)"
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="var(--brand)"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 250ms var(--ease-standard)" }}
        />
      </svg>

      {/* Center button */}
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={ariaLabel}
        aria-pressed={onClick ? complete : undefined}
        style={{ width: inner * 1.25, height: inner * 1.25 }}
        className={[
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          "flex items-center justify-center transition-colors",
          // 44px thumb target without growing the painted ring.
          "pointer-coarse:after:absolute pointer-coarse:after:-inset-3 pointer-coarse:after:content-['']",
          focusRing,
          complete
            ? "bg-brand text-brand-foreground"
            : "bg-background text-subtle hover:bg-brand-soft hover:text-brand-muted",
          onClick ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
      >
        <Check width={inner * 0.8} height={inner * 0.8} />
      </button>
    </div>
  );
}
