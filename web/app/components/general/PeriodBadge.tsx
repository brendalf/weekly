import { Period, getPeriodLabel } from "@weekly/domain";
import { Badge } from "./Badge";

const PERIOD_COLORS: Record<Period, string> = {
  [Period.DAY]: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  [Period.WEEK]: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  [Period.MONTH]: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
};

interface PeriodBadgeProps {
  period: Period;
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
      {getPeriodLabel(period)}
    </Badge>
  );
}
