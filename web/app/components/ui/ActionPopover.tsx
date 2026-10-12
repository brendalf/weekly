"use client";

import type { ReactNode } from "react";
import { Button, Popover } from "@heroui/react";
import type { PopoverContentProps } from "@heroui/react";
import { touchTarget } from "./styles";

/**
 * The escape hatch beside `ActionMenu`: an anchored panel of *arbitrary*
 * content rather than a list of menu rows.
 *
 * Wraps HeroUI's `Popover` (React Aria `DialogTrigger` + `Popover` + `Dialog`),
 * so it gets the same guarantees as `ActionMenu` — focus containment, `Esc`,
 * outside-click dismiss, collision detection, reposition on scroll/resize.
 *
 * Use this only when the content is not a menu: the notification feed, whose
 * rows carry their own Accept/Decline buttons, cannot be menu items. Anything
 * that *is* a list of actions belongs in `ActionMenu`.
 */
export interface ActionPopoverProps {
  /** Accessible name for the trigger. Required — triggers here are icon-only. */
  label: string;
  /** Panel content. */
  children: ReactNode;
  /** Trigger content (e.g. a bell with an unread badge). */
  trigger: ReactNode;
  /** Optional heading rendered above the content, inside the panel. */
  title?: string;
  /** Extra classes on the trigger button. */
  triggerClassName?: string;
  /** Extra classes on the popover — width overrides belong here. */
  className?: string;
  /** Where the panel opens relative to the trigger. @default "bottom end" */
  placement?: PopoverContentProps["placement"];
  /** Controlled open state. Omit to let the popover manage itself. */
  isOpen?: boolean;
  /** Called when the panel opens or closes (trigger, `Esc`, outside click). */
  onOpenChange?: (open: boolean) => void;
}

export function ActionPopover({
  label,
  children,
  trigger,
  title,
  triggerClassName,
  className,
  placement = "bottom end",
  isOpen,
  onOpenChange,
}: ActionPopoverProps) {
  return (
    <Popover.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      {/* A real <button>: React Aria's DialogTrigger hands it the press
          responder plus aria-haspopup/aria-expanded, and HeroUI's `.button`
          carries the focus-visible ring. */}
      <Button
        variant="ghost"
        aria-label={label}
        className={[
          "relative shrink-0 rounded-full",
          touchTarget,
          triggerClassName ?? "",
        ].join(" ")}
      >
        {trigger}
      </Button>

      <Popover.Content placement={placement} className={className}>
        <Popover.Dialog aria-label={title ?? label} className="p-2">
          {title && (
            <Popover.Heading className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-subtle uppercase">
              {title}
            </Popover.Heading>
          )}
          {children}
        </Popover.Dialog>
      </Popover.Content>
    </Popover.Root>
  );
}
