"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { DateValue } from "@internationalized/date";
import { getLocalTimeZone } from "@internationalized/date";
import { Period, getSkipPeriodKeys } from "@weekly/domain";
import {
  ArrowRight,
  Calendar,
  CirclePause,
  CirclePlay,
  Clock,
} from "@gravity-ui/icons";
import {
  Button,
  Calendar as HeroCalendar,
  Modal,
  useOverlayState,
} from "@heroui/react";
import { toast } from "sonner";
import type { ActionMenuEntry } from "../ui";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

/**
 * The skip flow, as data (PLAN WS10).
 *
 * It used to be a second hand-rolled dropdown nested inside the first one —
 * `HabitActionMenu` swapped its own body between a "main" and an "options"
 * view and drew a fake back button. It is now a **nested `items` array** on
 * the one `ActionMenu` primitive, so React Aria gives it a real submenu:
 * `→` / `←` between levels, typeahead, a focus trap, `Esc`, and repositioning
 * on scroll (DIRECTION §6.5).
 *
 * A date picker cannot live inside a menu, so "Skip until…" closes the menu
 * and opens a small dialog — the `dialog` node this hook hands back.
 */

export interface UseSkipMenuOptions {
  habitId: string;
  /** The day the row is showing — skips are relative to it, not to today. */
  referenceDate: Date;
  period: Period;
  /** The skip entry currently covering `referenceDate`, if any. */
  activeSkipKey: string | null;
  isSkipped: boolean;
}

export interface SkipMenu {
  /**
   * One `ActionMenu` row: `Unskip` while the habit is skipped, otherwise
   * `Skip` with the four options as a submenu.
   */
  entry: ActionMenuEntry;
  /** Render next to the menu — the "Skip until…" date dialog. */
  dialog: ReactNode;
}

export function useSkipMenu({
  habitId,
  referenceDate,
  period,
  activeSkipKey,
  isSkipped,
}: UseSkipMenuOptions): SkipMenu {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(habitId);

  const [untilDate, setUntilDate] = useState<DateValue | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const dialogState = useOverlayState({
    isOpen: dialogOpen,
    onOpenChange: (open) => {
      if (!open) setUntilDate(null);
      setDialogOpen(open);
    },
  });

  function skip(type: "today" | "week" | "month") {
    if (!repos) return;
    repos.habit
      .skipHabit(habitId, getSkipPeriodKeys(referenceDate, type))
      .catch(() => toast.error("Failed to skip habit. Please try again."));
  }

  function skipUntil() {
    if (!repos || !untilDate) return;
    const until = untilDate.toDate(getLocalTimeZone());
    repos.habit
      .skipHabit(
        habitId,
        getSkipPeriodKeys(referenceDate, "until", until, period),
      )
      .catch(() => toast.error("Failed to skip habit. Please try again."));
    setDialogOpen(false);
  }

  function unskip() {
    if (!repos || !activeSkipKey) return;
    repos.habit
      .unskipHabit(habitId, activeSkipKey)
      .catch(() => toast.error("Failed to unskip habit. Please try again."));
  }

  const entry: ActionMenuEntry = isSkipped
    ? {
        key: "unskip",
        label: "Unskip",
        icon: <CirclePlay width={16} height={16} />,
        onAction: unskip,
      }
    : {
        key: "skip",
        label: "Skip",
        icon: <CirclePause width={16} height={16} />,
        items: [
          {
            key: "skip-today",
            label: "Skip today",
            icon: <Clock width={16} height={16} />,
            onAction: () => skip("today"),
          },
          {
            key: "skip-week",
            label: "Skip this week",
            icon: <Calendar width={16} height={16} />,
            onAction: () => skip("week"),
          },
          {
            key: "skip-month",
            label: "Skip this month",
            icon: <Calendar width={16} height={16} />,
            onAction: () => skip("month"),
          },
          {
            key: "skip-until",
            label: "Skip until…",
            icon: <ArrowRight width={16} height={16} />,
            onAction: () => setDialogOpen(true),
          },
        ],
      };

  const dialog = (
    <Modal state={dialogState}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="bottom" size="sm" className="p-0 sm:p-10">
          <Modal.Dialog className="rounded-t-3xl rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-6 sm:pb-6">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="pr-10">Skip until</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-1">
              <HeroCalendar
                value={untilDate}
                onChange={setUntilDate}
                aria-label="Pick the first day the habit counts again"
              >
                <HeroCalendar.Header>
                  <HeroCalendar.NavButton slot="previous" />
                  <HeroCalendar.Heading />
                  <HeroCalendar.NavButton slot="next" />
                </HeroCalendar.Header>
                <HeroCalendar.Grid>
                  <HeroCalendar.GridHeader>
                    {(day) => (
                      <HeroCalendar.HeaderCell>{day}</HeroCalendar.HeaderCell>
                    )}
                  </HeroCalendar.GridHeader>
                  <HeroCalendar.GridBody>
                    {(date) => <HeroCalendar.Cell date={date} />}
                  </HeroCalendar.GridBody>
                </HeroCalendar.Grid>
              </HeroCalendar>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="ghost"
                className="min-h-11"
                onPress={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="min-h-11 bg-brand"
                isDisabled={!untilDate}
                onPress={skipUntil}
              >
                Skip habit
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );

  return { entry, dialog };
}
