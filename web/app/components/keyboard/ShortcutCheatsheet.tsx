"use client";

import { Modal, useOverlayState } from "@heroui/react";
import type { ShortcutGroup } from "../../hooks/useKeyboardShortcuts";

/**
 * The `?` overlay (DIRECTION §7).
 *
 * Its content is derived from the live binding list, not written out a second
 * time — a shortcut that exists is documented, and one that is removed stops
 * being advertised, without anyone remembering to update two places.
 */

export interface ShortcutCheatsheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ShortcutGroup[];
}

/** How a `KeyboardEvent.key` reads on a key cap. */
const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
};

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-border-strong bg-fill px-1.5 py-0.5 font-mono text-xs text-foreground">
      {KEY_LABELS[children] ?? children}
    </kbd>
  );
}

export function ShortcutCheatsheet({
  open,
  onOpenChange,
  groups,
}: ShortcutCheatsheetProps) {
  const state = useOverlayState({ isOpen: open, onOpenChange });

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="bottom" size="md" className="p-0 sm:p-10">
          <Modal.Dialog className="max-h-[85dvh] rounded-t-3xl rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-6 sm:pb-6">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="pr-10">
                Keyboard shortcuts
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="p-1">
              <div className="grid gap-5 sm:grid-cols-2">
                {groups.map((group) => (
                  <section key={group.group} className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-semibold tracking-wide text-subtle uppercase">
                      {group.group}
                    </h3>
                    <dl className="flex flex-col gap-1.5">
                      {group.entries.map((entry) => (
                        <div
                          key={entry.label}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <dt className="text-sm text-foreground">
                            {entry.label}
                          </dt>
                          <dd className="flex shrink-0 items-center gap-1">
                            {entry.keys.map((key) => (
                              <Key key={key}>{key}</Key>
                            ))}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>

              <p className="mt-5 text-xs text-subtle">
                Shortcuts stand down while you are typing in a field, or while
                a dialog or menu has focus.
              </p>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
