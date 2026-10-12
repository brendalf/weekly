import { Period, getPeriodLabel } from "@weekly/domain";
import { Badge } from "./Badge";

export const PERIOD_COLORS: Record<Period, string> = {
  [Period.DAY]: "bg-period-day-soft text-period-day",
  [Period.WEEK]: "bg-period-week-soft text-period-week",
  [Period.MONTH]: "bg-period-month-soft text-period-month",
};

interface PeriodBadgeProps {
  period: Period;
  className?: string;
}

const PERIOD_SHORT: Record<Period, string> = {
  [Period.DAY]: "T",
  [Period.WEEK]: "W",
  [Period.MONTH]: "M",
};

export function PeriodBadge({ period, className }: PeriodBadgeProps) {
  const full = getPeriodLabel(period);
  const short = PERIOD_SHORT[period];
  return (
    <Badge
      className={[
        "shrink-0",
        PERIOD_COLORS[period] ?? "",
        className ?? "",
      ].join(" ")}
    >
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </Badge>
  );
}
