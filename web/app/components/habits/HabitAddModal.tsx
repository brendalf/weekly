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
import { Period, HabitTimeOfDay } from "@weekly/domain";
import { Check } from "@gravity-ui/icons";
import { ActiveDaysSelector } from "./ActiveDaysSelector";
import { TimeOfDaySelector } from "./TimeOfDaySelector";
import { HabitPeriodSelect } from "./HabitPeriodSelect";
import { WorkspaceField } from "../general/WorkspaceField";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface HabitAddModalProps {
  onSubmit: (
    name: string,
    times: number,
    period: Period,
    workspaceId?: string,
    activeDays?: number[],
    timeOfDay?: HabitTimeOfDay,
  ) => void;
  trigger?: ReactElement;
  workspaces?: { id: string; name: string }[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HabitAddModal({
  onSubmit,
  trigger,
  workspaces,
  isOpen,
  onOpenChange,
}: HabitAddModalProps) {
  const [name, setName] = useState("");
  const [times, setTimes] = useState("1");
  const [period, setPeriod] = useState<Period>(Period.WEEK);
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces?.[0]?.id ?? "");
  const [activeDays, setActiveDays] = useState<number[]>(ALL_DAYS);
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay | undefined>(undefined);

  function reset() {
    setName("");
    setTimes("1");
    setPeriod(Period.WEEK);
    setWorkspaceId(workspaces?.[0]?.id ?? "");
    setActiveDays(ALL_DAYS);
    setTimeOfDay(undefined);
  }

  function handleSave(close: () => void) {
    const trimmed = name.trim();
    const n = Number(times);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    if (workspaces && !workspaceId) return;
    const days = period === Period.DAY && activeDays.length < 7 ? activeDays : undefined;
    onSubmit(trimmed, n, period, workspaces ? workspaceId : undefined, days, timeOfDay);
    reset();
    close();
  }

  const isValid =
    Boolean(name.trim()) &&
    Number(times) > 0 &&
    (!workspaces || Boolean(workspaceId));

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange?.(open);
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
                      {workspaces && (
                        <WorkspaceField
                          workspaces={workspaces}
                          value={workspaceId}
                          onChange={setWorkspaceId}
                        />
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
                        <HabitPeriodSelect value={period} onChange={setPeriod} />
                      </div>
                      {period === Period.DAY && (
                        <div className="mt-4">
                          <Label>Active days</Label>
                          <div className="mt-1">
                            <ActiveDaysSelector
                              activeDays={activeDays}
                              onChange={setActiveDays}
                            />
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <Label>Time of day</Label>
                        <div className="mt-1">
                          <TimeOfDaySelector value={timeOfDay} onChange={setTimeOfDay} />
                        </div>
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
