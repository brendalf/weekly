import { ReactNode } from "react";

interface BadgeProps {
  className: string;
  children: ReactNode;
}

export function Badge({ className, children }: BadgeProps) {
  return (
    <span className={["rounded-full px-1.5 py-0.5 text-xs font-medium", className].join(" ")}>
      {children}
    </span>
  );
}
