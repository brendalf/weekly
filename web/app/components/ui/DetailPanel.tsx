"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Modal, useMediaQuery, useOverlayState } from "@heroui/react";
import { Xmark } from "@gravity-ui/icons";
import { focusRing, touchTarget } from "./styles";

/**
 * The one detail surface (DIRECTION §5), in two presentations:
 *
 * | Viewport | Presentation |
 * |---|---|
 * | `lg:` and up | right-side panel, 420px, **non-modal** so the page stays interactive beside it |
 * | below `lg:` | bottom sheet — the treatment `NoteDetailsModal` already got right, lifted here |
 *
 * Both close on `Esc` and on an outside click. The desktop half is deliberately
 * *not* a HeroUI `Modal`: React Aria's `ModalOverlay` traps focus and hides the
 * rest of the page from assistive tech, which is the opposite of "the page
 * stays interactive". The mobile half *is* a `Modal`, because a sheet over a
 * dimmed page is modal by nature — and that is where the focus trap, the scroll
 * lock, and the enter/exit animation earn their keep.
 *
 * Confirmations inside a panel use `ConfirmButton`, never a nested modal.
 */
export interface DetailPanelProps {
  /** Whether the panel is showing. */
  open: boolean;
  /** Called with `false` on `Esc`, an outside click, or the close button. */
  onOpenChange: (open: boolean) => void;
  /** Panel title. Also the dialog's accessible name when it is a plain string. */
  title: ReactNode;
  /** Accessible name to use when `title` is not a plain string. */
  ariaLabel?: string;
  /** The panel body. Scrolls on its own; the page behind it does not. */
  children: ReactNode;
  /** Actions pinned to the bottom of the panel. */
  footer?: ReactNode;
  /** Extra classes on the scrolling body. */
  className?: string;
}

/** `lg:` — the breakpoint DIRECTION §5 picks for panel vs. sheet. */
const DESKTOP_QUERY = "(min-width: 64rem)";

function accessibleName(title: ReactNode, ariaLabel?: string) {
  if (ariaLabel) return ariaLabel;
  return typeof title === "string" ? title : "Details";
}

export function DetailPanel({
  open,
  onOpenChange,
  title,
  ariaLabel,
  children,
  footer,
  className,
}: DetailPanelProps) {
  // `initializeWithValue: false` keeps the first client render identical to the
  // server one; the hook's layout effect corrects it before paint, so there is
  // no hydration mismatch and no visible flash of the wrong presentation.
  const isDesktop = useMediaQuery(DESKTOP_QUERY, { initializeWithValue: false });
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const state = useOverlayState({ isOpen: open, onOpenChange });
  const label = accessibleName(title, ariaLabel);
  const isPanel = open && isDesktop;

  // Esc and outside-click dismissal for the non-modal desktop panel. The sheet
  // gets both from React Aria.
  useEffect(() => {
    if (!isPanel) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    function handlePointerDown(event: PointerEvent) {
      const panel = panelRef.current;
      if (panel && !panel.contains(event.target as Node)) onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isPanel, onOpenChange]);

  // Move focus into the panel on open and hand it back on close — the part a
  // modal would do for us. Focus is *not* trapped: tabbing past the last
  // control continues into the page, which is the point of a non-modal panel.
  useEffect(() => {
    if (!isPanel) return;
    const panel = panelRef.current;
    const previous = document.activeElement as HTMLElement | null;
    restoreFocusRef.current = previous;
    panel?.focus();

    return () => {
      const target = restoreFocusRef.current;
      const active = document.activeElement;
      // Only hand focus back if nothing outside the panel has claimed it since
      // (clicking an input on the page closes the panel — don't steal it back).
      const focusWasInside =
        active === null || active === document.body || panel?.contains(active);
      if (focusWasInside && target?.isConnected) target.focus();
    };
  }, [isPanel]);

  if (!open) return null;

  if (isDesktop) {
    return (
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={false}
        aria-label={label}
        tabIndex={-1}
        className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[26.25rem] flex-col border-l border-border bg-surface shadow-xl outline-none"
      >
        <header className="flex items-start gap-2 border-b border-border p-4">
          <h2 className="flex-1 text-lg font-medium break-words text-foreground">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => onOpenChange(false)}
            className={`-m-2 flex shrink-0 cursor-pointer items-center justify-center rounded-lg text-subtle transition-colors hover:text-foreground ${touchTarget} ${focusRing}`}
          >
            <Xmark width={16} height={16} />
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto p-4 ${className ?? ""}`}>
          {children}
        </div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </aside>
    );
  }

  // Bottom sheet — styling lifted verbatim from `NoteDetailsModal`, which is
  // the only place in the app that got the mobile treatment right.
  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="bottom" size="sm" className="p-0 sm:p-10">
          <Modal.Dialog
            aria-label={label}
            className="h-full max-h-full rounded-b-none rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[85dvh] sm:rounded-3xl sm:p-6 sm:pb-6"
          >
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="pr-10 break-words">{title}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className={`p-1 ${className ?? ""}`}>
              {children}
            </Modal.Body>

            {footer && (
              <Modal.Footer className="flex-wrap">{footer}</Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
