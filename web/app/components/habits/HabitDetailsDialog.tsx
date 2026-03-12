"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Surface,
  useOverlayState,
} from "@heroui/react";
import { HabitPeriod, HabitCompletionLog } from "@weekly/domain";
import { habitRepository } from "../../repositories";

interface HabitDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  habitId: string;
  name: string;
  times: number;
  period: HabitPeriod;
}

export function HabitDetailsDialog({
  open,
  onOpenChange,
  userId,
  habitId,
  name,
  times,
  period,
}: HabitDetailsDialogProps) {
  const [logs, setLogs] = useState<HabitCompletionLog[]>([]);

  const state = useOverlayState({ isOpen: open, onOpenChange });

  useEffect(() => {
    if (!open) return;
    const unsub = habitRepository.subscribeHabitCompletions(userId, habitId, setLogs);
    return () => unsub();
  }, [open, userId, habitId]);

  async function handleDelete() {
    await habitRepository.deleteHabit(userId, habitId);
    state.close();
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{name}</Modal.Heading>
              <p className="mt-1 text-sm text-foreground/60">{times}× / {period}</p>
            </Modal.Header>
            <Modal.Body className="p-6">
              <Surface variant="default">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">Completion logs</p>
                  {logs.length === 0 ? (
                    <p className="text-sm text-foreground/60">No completions yet.</p>
                  ) : (
                    <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                      {logs.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between rounded-lg border border-foreground/10 bg-background px-3 py-2"
                        >
                          <span className="text-xs text-foreground/60">
                            {l.occurredAt ? new Date(l.occurredAt).toLocaleString() : ""}
                          </span>
                          <span className="text-xs text-foreground/60">{l.periodKey ?? ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Surface>
            </Modal.Body>
            <Modal.Footer className="justify-between">
              <Button variant="danger" onPress={handleDelete}>
                Delete habit
              </Button>
              <Button variant="secondary" onPress={state.close}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
