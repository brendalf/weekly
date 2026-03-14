"use client";

import { ReactElement, useState } from "react";
import {
  Modal,
  Button,
  Select,
  Input,
  Label,
  TextField,
  Surface,
  ListBox,
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
    <Modal
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
      }}
    >
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
                <Modal.Body className="p-1">
                  <Surface variant="default">
                    <form
                      className="flex flex-col"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSave(close);
                      }}
                    >
                      <TextField name="name">
                        <Label>Name</Label>
                        <Input
                          placeholder="e.g. Read a book"
                          value={name}
                          variant="secondary"
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                        />
                      </TextField>
                      <div className="mt-4">Frequency</div>
                      <div className="mt-1 flex items-end gap-2">
                        <Input
                          type="number"
                          value={times}
                          className="max-w-20"
                          variant="secondary"
                          placeholder="Times"
                          onChange={(e) => setTimes(e.target.value)}
                        />
                        <Select
                          fullWidth
                          placeholder="Period"
                          variant="secondary"
                          onChange={(e) => setPeriod(e as HabitPeriod)}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item
                                id={HabitPeriod.Day}
                                textValue={HabitPeriod.Day}
                              >
                                per day
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id={HabitPeriod.Week}
                                textValue={HabitPeriod.Week}
                              >
                                per week
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id={HabitPeriod.Month}
                                textValue={HabitPeriod.Month}
                              >
                                per month
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    </form>
                  </Surface>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    isDisabled={!isValid}
                    onPress={() => handleSave(close)}
                  >
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
