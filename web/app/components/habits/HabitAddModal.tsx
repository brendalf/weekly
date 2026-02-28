"use client";

import { ReactElement, useState, useSyncExternalStore } from "react";
import { HabitPeriod } from "@weekly/domain";
import {
  Button,
  Dialog,
  Fieldset,
  Input,
  Label,
  XStack,
  YStack,
} from "tamagui";

interface HabitAddModalProps {
  onSubmit: (name: string, times: number, period: HabitPeriod) => void;
  trigger?: ReactElement;
}

export function HabitAddModal({ onSubmit, trigger }: HabitAddModalProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [times, setTimes] = useState<string>("1");
  const [period, setPeriod] = useState<HabitPeriod>(HabitPeriod.Week);

  const reset = () => {
    setName("");
    setTimes("1");
    setPeriod(HabitPeriod.Week);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    const n = Number(times);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    onSubmit(trimmed, n, period);
    setOpen(false);
    reset();
  }

  const isValid = Boolean(name.trim()) && Number(times) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen} modal>
      <Dialog.Trigger asChild>
        {trigger ?? <Button size="$3">Add habit</Button>}
      </Dialog.Trigger>

      {isClient && open && (
        <Dialog.Portal>
          <Dialog.Overlay key="overlay" opacity={0.5} enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
          <Dialog.Content key="content" bordered elevate size="$4" gap="$3">
            <Dialog.Title>Add habit</Dialog.Title>
            <Dialog.Description>
              Define how often you want to do this habit.
            </Dialog.Description>

            <YStack gap="$3">
              <Fieldset gap="$2">
                <Label htmlFor="habit-name">Name</Label>
                <Input id="habit-name" size="$3" value={name} onChangeText={setName} placeholder="e.g. Read a book" />
              </Fieldset>

              <Fieldset gap="$2">
                <Label>Frequency</Label>
                <XStack gap="$2" style={{ alignItems: "center" }}>
                  <Input
                    size="$3"
                    width={80}
                    keyboardType="number-pad"
                    value={times}
                    onChangeText={setTimes}
                  />
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as HabitPeriod)}
                    style={{ width: 140, height: 36, padding: 6, borderRadius: 6 }}
                  >
                    <option value={HabitPeriod.Day}>per day</option>
                    <option value={HabitPeriod.Week}>per week</option>
                    <option value={HabitPeriod.Month}>per month</option>
                  </select>
                </XStack>
              </Fieldset>
            </YStack>

            <XStack gap="$2" style={{ justifyContent: "flex-end" }}>
              <Dialog.Close asChild>
                <Button size="$3" onPress={reset}>Cancel</Button>
              </Dialog.Close>
              <Button size="$3" theme="accent" disabled={!isValid} onPress={handleSave}>
                Save
              </Button>
            </XStack>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog>
  );
}
