"use client";

import { useState } from "react";
import { Period } from "@weekly/domain";
import { Archive, Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Modal, useOverlayState } from "@heroui/react";
import { toast } from "sonner";
import { ActionMenu } from "../ui";
import type { ActionMenuEntry } from "../ui";
import { rowControl } from "../../hooks/useRowKeys";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { useSkipMenu } from "./SkipMenu";

/**
 * The habit row's `⋯` (PLAN WS10 / DIRECTION §7).
 *
 * Two things were wrong with it:
 *
 * 1. **It only offered Skip/Unskip.** Editing or deleting a habit meant
 *    opening its detail view first.
 * 2. **`HabitItem` wrapped the whole trigger in `{!complete && …}`**, so a
 *    habit you had finished could not be edited, skipped, archived or deleted
 *    from its row at all — the menu vanished at exactly the moment a mis-tap
 *    makes you want it. The guard is gone; the menu is always present.
 *
 * The implementation moved too. It was `createPortal` plus a single
 * `getBoundingClientRect` measured once on open, with no scroll or resize
 * listener, so scrolling the page left the menu floating where the row used to
 * be. It is now the shared `ActionMenu` (DIRECTION §6.5).
 *
 * **Delete asks first**, because a habit's completion history is not
 * recoverable and nothing else in the app can rebuild it (DIRECTION §7).
 * Tasks and notes take the opposite deal — instant, with an undo toast.
 */

export interface HabitActionMenuProps {
  habitId: string;
  /** Used in the delete confirmation, so the dialog names what it destroys. */
  name: string;
  period: Period;
  /** The day the row is showing. Skips are relative to it. */
  referenceDate: Date;
  /** The skip entry currently covering `referenceDate`, if any. */
  activeSkipKey: string | null;
  isSkipped: boolean;
  /** Opens the habit's detail view in edit mode. */
  onEdit: () => void;
  /** Runs after a successful delete — the row is about to disappear. */
  onDeleted?: () => void;
}

export function HabitActionMenu({
  habitId,
  name,
  period,
  referenceDate,
  activeSkipKey,
  isSkipped,
  onEdit,
  onDeleted,
}: HabitActionMenuProps) {
  const { getHabitRepos } = useRepositoryContext();
  const repos = getHabitRepos(habitId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmState = useOverlayState({
    isOpen: confirmOpen,
    onOpenChange: setConfirmOpen,
  });

  const skip = useSkipMenu({
    habitId,
    referenceDate,
    period,
    activeSkipKey,
    isSkipped,
  });

  function handleDelete() {
    setConfirmOpen(false);
    if (!repos) return;
    repos.habit
      .deleteHabit(habitId)
      .then(() => onDeleted?.())
      .catch(() => toast.error("Failed to delete habit. Please try again."));
  }

  const items: ActionMenuEntry[] = [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil width={16} height={16} />,
      onAction: onEdit,
    },
    skip.entry,
    {
      key: "archive",
      label: "Archive",
      icon: <Archive width={16} height={16} />,
      // DIRECTION §8: `Habit` has no `archived` field and inventing one inside
      // a UI workstream is explicitly out of scope. The row states the gap
      // rather than hiding it.
      description: "Needs an archive field — coming soon",
      disabled: true,
    },
    { kind: "separator", key: "sep" },
    {
      key: "delete",
      label: "Delete",
      icon: <TrashBin width={16} height={16} />,
      danger: true,
      onAction: () => setConfirmOpen(true),
    },
  ];

  return (
    <>
      <ActionMenu
        label={`Actions for ${name}`}
        items={items}
        triggerClassName={rowControl}
        popoverClassName="w-56"
      />

      {skip.dialog}

      <Modal state={confirmState}>
        <Modal.Backdrop variant="blur">
          <Modal.Container placement="bottom" size="sm" className="p-0 sm:p-10">
            <Modal.Dialog
              role="alertdialog"
              className="rounded-t-3xl rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-6 sm:pb-6"
            >
              <Modal.Header>
                <Modal.Heading className="pr-10 break-words">
                  Delete “{name}”?
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="p-1">
                <p className="text-sm text-muted">
                  This also deletes every check-in and the streak built from
                  them. It cannot be undone.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onPress={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="min-h-11"
                  onPress={handleDelete}
                >
                  Delete habit
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
