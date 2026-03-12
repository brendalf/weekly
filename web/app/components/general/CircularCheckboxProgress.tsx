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
          stroke="var(--color-foreground, currentColor)"
          strokeOpacity={0.1}
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="var(--color-primary, purple)"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>

      {/* Center button */}
      <button
        onClick={onClick}
        disabled={complete}
        aria-label={ariaLabel}
        style={{ width: inner, height: inner }}
        className={[
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          "flex items-center justify-center transition-colors",
          complete
            ? "bg-accent cursor-default"
            : "bg-background border border-foreground/20 hover:border-accent/60 cursor-pointer",
        ].join(" ")}
      >
        <Check width={inner * 0.7} height={inner * 0.7} />
      </button>
    </div>
  );
}
