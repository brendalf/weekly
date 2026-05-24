"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Period } from "@weekly/domain";
import { CirclePause, CirclePlay, ArrowChevronLeft } from "@gravity-ui/icons";
import { SkipMenu } from "./SkipMenu";

interface HabitActionMenuProps {
  habitId: string;
  referenceDate: Date;
  period: Period;
  currentPeriodKey: string;
  isSkipped: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type MenuView = "main" | "options";

const menuItemClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-foreground/6 transition-colors";

export function HabitActionMenu({
  habitId,
  referenceDate,
  period,
  currentPeriodKey,
  isSkipped,
  triggerRef,
  isOpen,
  onOpenChange,
}: HabitActionMenuProps) {
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setMenuView("main");
    }
  }, [isOpen, triggerRef]);

  function close() {
    onOpenChange(false);
    setMenuView("main");
  }

  if (!isOpen || !menuPos) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200]"
        onClick={(e) => { e.stopPropagation(); close(); }}
      />
      <div
        className="fixed z-[210] w-52 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-xl"
        style={{ top: menuPos.top, right: menuPos.right }}
      >
        {/* ── Level 1: main ── */}
        {menuView === "main" && (
          <div className="p-1">
            {isSkipped ? (
              <button onClick={close} className={menuItemClass}>
                <CirclePlay width={14} height={14} className="shrink-0 text-foreground/60" />
                Unskip
              </button>
            ) : (
              <button onClick={() => setMenuView("options")} className={menuItemClass}>
                <CirclePause width={14} height={14} className="shrink-0 text-foreground/60" />
                Skip
                <ArrowChevronLeft
                  width={12}
                  height={12}
                  className="ml-auto rotate-180 text-foreground/30"
                />
              </button>
            )}
          </div>
        )}

        {/* ── Level 2: skip options ── */}
        {menuView === "options" && (
          <div className="p-1">
            <button
              onClick={() => setMenuView("main")}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-foreground/50 hover:text-foreground transition-colors"
            >
              <ArrowChevronLeft width={12} height={12} />
              Skip
            </button>
            <div className="my-1 mx-2 border-t border-foreground/10" />
            <SkipMenu
              habitId={habitId}
              referenceDate={referenceDate}
              period={period}
              currentPeriodKey={currentPeriodKey}
              isSkipped={isSkipped}
              onClose={close}
              buttonClassName={menuItemClass}
            />
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
