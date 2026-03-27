"use client";

import { ChevronsUp } from "@gravity-ui/icons";

interface SectionHeaderProps {
  label: string;
  collapsed: boolean;
  done: number;
  total: number;
  onToggle: () => void;
}

export function SectionHeader({
  label,
  collapsed,
  done,
  total,
  onToggle,
}: SectionHeaderProps) {
  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none pb-1"
      onClick={onToggle}
    >
      {collapsed && (
        <ChevronsUp width={12} height={12} className="text-foreground/40 shrink-0" />
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">{label}</p>
      {collapsed && total > 0 && (
        <p className="text-xs text-foreground/30">{done}/{total}</p>
      )}
    </div>
  );
}
