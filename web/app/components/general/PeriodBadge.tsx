import { HabitPeriod, getPeriodLabel } from "@weekly/domain";
import { Badge } from "./Badge";

const PERIOD_COLORS: Record<string, string> = {
  day: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  week: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  month: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
};

interface PeriodBadgeProps {
  period: HabitPeriod | "day" | "week" | "month";
  className?: string;
}

export function PeriodBadge({ period, className }: PeriodBadgeProps) {
  return (
    <Badge
      className={[
        "shrink-0",
        PERIOD_COLORS[period] ?? "",
        className ?? "",
      ].join(" ")}
    >
      {getPeriodLabel(period as HabitPeriod)}
    </Badge>
  );
}
