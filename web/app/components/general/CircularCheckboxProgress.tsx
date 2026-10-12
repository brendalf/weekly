"use client";

import { Check } from "@gravity-ui/icons";

interface CircularCheckboxProgressProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  complete?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function CircularCheckboxProgress({
  size = 32,
  stroke = 3,
  progress,
  complete = false,
  onClick,
  ariaLabel,
}: CircularCheckboxProgressProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  const inner = size - stroke * 2 - 4;

  return (
    <div
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
        onClick={onClick}
        disabled={complete}
        aria-label={ariaLabel}
        style={{ width: inner * 1.25, height: inner * 1.25 }}
        className={[
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          "flex items-center justify-center transition-colors",
          complete
            ? "bg-brand text-brand-foreground cursor-default"
            : "bg-background text-subtle hover:bg-brand-soft hover:text-brand-muted cursor-pointer",
        ].join(" ")}
      >
        <Check width={inner * 0.8} height={inner * 0.8} />
      </button>
    </div>
  );
}
