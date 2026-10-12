"use client";
import { WEEKDAY_LABELS } from "@weekly/domain";

interface ActiveDaysSelectorProps {
  activeDays: number[];
  onChange: (days: number[]) => void;
}

export function ActiveDaysSelector({ activeDays, onChange }: ActiveDaysSelectorProps) {
  function toggle(day: number) {
    if (activeDays.includes(day)) {
      if (activeDays.length <= 1) return;
      onChange(activeDays.filter((d) => d !== day));
    } else {
      onChange([...activeDays, day].sort((a, b) => a - b));
    }
  }
  return (
    <div className="flex gap-1">
      {WEEKDAY_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(i)}
          className={[
            "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-colors",
            activeDays.includes(i)
              ? "bg-brand text-brand-foreground"
              : "bg-fill text-muted hover:bg-fill-strong",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
