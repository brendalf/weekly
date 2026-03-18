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
import { Check } from "@gravity-ui/icons";

interface HabitAddModalProps {
  onSubmit: (
    name: string,
    times: number,
    period: HabitPeriod,
    projectId?: string,
  ) => void;
  trigger?: ReactElement;
  projects?: { id: string; name: string }[];
}

export function HabitAddModal({
  onSubmit,
  trigger,
  projects,
}: HabitAddModalProps) {
  const [name, setName] = useState("");
  const [times, setTimes] = useState("1");
  const [period, setPeriod] = useState<HabitPeriod>(HabitPeriod.Week);
  const [projectId, setProjectId] = useState<string>(projects?.[0]?.id ?? "");

  function reset() {
    setName("");
    setTimes("1");
    setPeriod(HabitPeriod.Week);
    setProjectId(projects?.[0]?.id ?? "");
  }

  function handleSave(close: () => void) {
    const trimmed = name.trim();
    const n = Number(times);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    if (projects && !projectId) return;
    onSubmit(trimmed, n, period, projects ? projectId : undefined);
    reset();
    close();
  }

  const isValid =
    Boolean(name.trim()) &&
    Number(times) > 0 &&
    (!projects || Boolean(projectId));

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
                      {projects && projects.length > 0 && (
                        <div className="mt-4">
                          <Label>Project</Label>
                          <Select
                            fullWidth
                            placeholder="Select project"
                            variant="secondary"
                            value={projectId}
                            onChange={(e) => setProjectId(e as string)}
                          >
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {projects.map((p) => (
                                  <ListBox.Item
                                    key={p.id}
                                    id={p.id}
                                    textValue={p.name}
                                  >
                                    {p.name}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      )}
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
                          value={HabitPeriod.Day}
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
                    <Check />
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
