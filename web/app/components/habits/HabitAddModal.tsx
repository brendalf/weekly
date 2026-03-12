"use client";

import { ReactElement, useState } from "react";
import {
  Modal,
  Button,
  Input,
  Label,
  TextField,
  Surface,
} from "@heroui/react";
import { HabitPeriod } from "@weekly/domain";

interface HabitAddModalProps {
  onSubmit: (name: string, times: number, period: HabitPeriod) => void;
  trigger?: ReactElement;
}

export function HabitAddModal({ onSubmit, trigger }: HabitAddModalProps) {
  const [name, setName] = useState("");
  const [times, setTimes] = useState("1");
  const [period, setPeriod] = useState<HabitPeriod>(HabitPeriod.Week);

  function reset() {
    setName("");
    setTimes("1");
    setPeriod(HabitPeriod.Week);
  }

  function handleSave(close: () => void) {
    const trimmed = name.trim();
    const n = Number(times);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    onSubmit(trimmed, n, period);
    reset();
    close();
  }

  const isValid = Boolean(name.trim()) && Number(times) > 0;

  return (
    <Modal onOpenChange={(isOpen) => { if (!isOpen) reset(); }}>
      {trigger ?? <Button size="sm">Add habit</Button>}
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Add habit</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="p-6">
                  <Surface variant="default">
                    <form
                      className="flex flex-col gap-4"
                      onSubmit={(e) => { e.preventDefault(); handleSave(close); }}
                    >
                      <TextField className="w-full" name="name">
                        <Label>Name</Label>
                        <Input
                          placeholder="e.g. Read a book"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                        />
                      </TextField>
                      <div className="flex items-end gap-2">
                        <TextField name="times" className="w-24">
                          <Label>Times</Label>
                          <Input
                            type="number"
                            value={times}
                            onChange={(e) => setTimes(e.target.value)}
                          />
                        </TextField>
                        <div className="flex flex-1 flex-col gap-1.5">
                          <label className="text-sm font-medium text-foreground">Period</label>
                          <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as HabitPeriod)}
                            className="h-10 rounded-lg border border-foreground/10 bg-field px-3 text-sm text-foreground"
                          >
                            <option value={HabitPeriod.Day}>per day</option>
                            <option value={HabitPeriod.Week}>per week</option>
                            <option value={HabitPeriod.Month}>per month</option>
                          </select>
                        </div>
                      </div>
                    </form>
                  </Surface>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={() => { reset(); close(); }}>
                    Cancel
                  </Button>
                  <Button isDisabled={!isValid} onPress={() => handleSave(close)}>
                    Save
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
