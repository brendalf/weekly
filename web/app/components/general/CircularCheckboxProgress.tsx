"use client";

import React from "react";

interface CircularCheckboxProgressProps {
  size?: number; // outer square size in px
  stroke?: number; // ring thickness
  progress: number; // 0..1
  complete?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function CircularCheckboxProgress({
  size = 28,
  stroke = 4,
  progress,
  complete = false,
  onClick,
  ariaLabel,
}: CircularCheckboxProgressProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} stroke="#E2E2E2" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="purple"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <button
        onClick={onClick}
        disabled={complete}
        style={{
          position: "absolute",
          inset: 0,
          margin: 2,
          borderRadius: 9999,
          border: "1px solid #A0A0A0",
          background: complete ? "purple" : "white",
          color: complete ? "white" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          lineHeight: 1,
          cursor: complete ? "default" : "pointer",
        }}
        aria-label={ariaLabel}
      >
        ✓
      </button>
    </div>
  );
}
