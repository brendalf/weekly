"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Dialog, Paragraph, XStack, YStack } from "tamagui";
import { HabitPeriod } from "@weekly/domain";
import {
  deleteHabbitRemote,
  subscribeToHabitCompletions,
  HabitCompletionLog,
} from "../../stores/habbits";

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
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [logs, setLogs] = useState<HabitCompletionLog[]>([]);

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeToHabitCompletions(userId, habitId, setLogs);
    return () => unsub();
  }, [open, userId, habitId]);

  async function handleDelete() {
    await deleteHabbitRemote(userId, habitId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      {isClient && open && (
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content key="content" bordered elevate size="$4" gap="$3">
            <Dialog.Title>{name}</Dialog.Title>
            <Dialog.Description>
              {times} / {period}
            </Dialog.Description>

            <YStack gap="$2">
              <Paragraph size="$2" fontWeight="600">
                Completion logs
              </Paragraph>
              {logs.length === 0 ? (
                <Paragraph size="$2" color="$color10">
                  No completions yet.
                </Paragraph>
              ) : (
                <YStack gap="$1">
                  {logs.map((l) => (
                    <XStack
                      key={l.id}
                      style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 8,
                        backgroundColor: "#f3f4f6",
                        borderRadius: 10,
                      }}
                    >
                      <Paragraph size="$1" color="$color10">
                        {l.occurredAt ? new Date(l.occurredAt).toLocaleString() : ""}
                      </Paragraph>
                      <Paragraph size="$1" color="$color10">
                        {l.periodKey ?? ""}
                      </Paragraph>
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>

            <XStack gap="$2" style={{ justifyContent: "space-between" }}>
              <Dialog.Close asChild>
                <Button size="$3">Close</Button>
              </Dialog.Close>
              <Button size="$3" theme="red" onPress={handleDelete}>
                Delete habit
              </Button>
            </XStack>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog>
  );
}
