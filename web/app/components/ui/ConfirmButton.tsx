"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { touchRow } from "./styles";

/**
 * A two-step destructive action, inline — extracted from the `confirmingDelete`
 * state in `NoteDetailsModal`, which is the only place in the app that asks
 * before destroying something.
 *
 * First press arms it and swaps the control for `Cancel` + the confirm button;
 * second press fires `onConfirm`. **Never a modal inside a modal**
 * (DIRECTION §5) — this is why that rule is affordable.
 *
 * Both steps carry a text label: a destructive action that is only a trash
 * glyph looks exactly as safe as the save button beside it (DIRECTION §6.7).
 */
export interface ConfirmButtonProps {
  /** Resting label. Name the action and its object: `"Delete habit"`. */
  label: string;
  /** Label on the armed confirm button. @default `label` */
  confirmLabel?: string;
  /** Label on the escape hatch shown while armed. @default "Cancel" */
  cancelLabel?: string;
  /** Fired once, on the second press. */
  onConfirm: () => void;
  /** Called when the user backs out. Use to clear any related state. */
  onCancel?: () => void;
  /**
   * One short line of consequence, shown only while armed:
   * `"This deletes 42 check-ins."` Say what is lost when it is not recoverable.
   */
  hint?: string;
  /** Leading icon on the resting button. */
  icon?: ReactNode;
  /**
   * Resting appearance. `"danger"` is red at rest; `"ghost"` stays quiet until
   * armed, for actions tucked into a crowded footer. @default "danger"
   */
  variant?: "danger" | "ghost";
  /** Blocks both steps. */
  isDisabled?: boolean;
  /** Extra classes on the buttons. */
  className?: string;
}

export function ConfirmButton({
  label,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  hint,
  icon,
  variant = "danger",
  isDisabled,
  className,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  // HeroUI's `.button` already carries the focus-visible ring; add the 44px
  // minimum height it does not.
  const buttonClass = `${touchRow} ${className ?? ""}`;

  if (armed) {
    return (
      <>
        {hint && (
          <p className="mr-auto max-w-[18rem] text-xs text-muted">{hint}</p>
        )}
        <Button
          variant="ghost"
          className={buttonClass}
          onPress={() => {
            setArmed(false);
            onCancel?.();
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="danger"
          className={buttonClass}
          isDisabled={isDisabled}
          onPress={() => {
            setArmed(false);
            onConfirm();
          }}
        >
          {confirmLabel ?? label}
        </Button>
      </>
    );
  }

  return (
    <Button
      variant={variant}
      className={buttonClass}
      isDisabled={isDisabled}
      onPress={() => setArmed(true)}
    >
      {icon}
      {label}
    </Button>
  );
}
