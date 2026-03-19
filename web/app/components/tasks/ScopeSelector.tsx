"use client";
import { TaskScope } from "@weekly/domain";

const SCOPE_OPTIONS: { value: TaskScope; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

interface ScopeSelectorProps {
  value: TaskScope;
  onChange: (scope: TaskScope) => void;
  /** When true each button stretches to fill equal width (used in the add modal). */
  fullWidth?: boolean;
}

export function ScopeSelector({ value, onChange, fullWidth = false }: ScopeSelectorProps) {
  return (
    <div className="flex gap-1">
      {SCOPE_OPTIONS.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={[
            "cursor-pointer rounded-lg text-xs font-medium transition-colors",
            fullWidth ? "flex-1 px-2 py-1.5" : "px-3 py-1.5",
            value === v
              ? "bg-purple-500 text-white"
              : "bg-foreground/10 text-foreground hover:bg-foreground/20",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export { SCOPE_OPTIONS };
