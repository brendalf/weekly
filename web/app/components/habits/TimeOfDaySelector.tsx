"use client";
import { HabitTimeOfDay, TIME_OF_DAY_OPTIONS } from "@weekly/domain";

interface TimeOfDaySelectorProps {
  value: HabitTimeOfDay | undefined;
  onChange: (value: HabitTimeOfDay | undefined) => void;
}

export function TimeOfDaySelector({ value, onChange }: TimeOfDaySelectorProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {TIME_OF_DAY_OPTIONS.map((tod) => (
        <button
          key={tod}
          type="button"
          onClick={() => onChange(value === tod ? undefined : tod)}
          className={[
            "cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors",
            value === tod
              ? "bg-purple-500 text-white"
              : "bg-foreground/10 text-foreground/50 hover:bg-foreground/20",
          ].join(" ")}
        >
          {tod.charAt(0).toUpperCase() + tod.slice(1)}
        </button>
      ))}
    </div>
  );
}
