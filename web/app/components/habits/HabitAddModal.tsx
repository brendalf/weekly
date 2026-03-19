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
import { HabitPeriod, HabitTimeOfDay } from "@weekly/domain";
import { Check } from "@gravity-ui/icons";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface HabitAddModalProps {
  onSubmit: (
    name: string,
    times: number,
    period: HabitPeriod,
    projectId?: string,
    activeDays?: number[],
    timeOfDay?: HabitTimeOfDay,
  ) => void;
  trigger?: ReactElement;
  projects?: { id: string; name: string }[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HabitAddModal({
  onSubmit,
  trigger,
  projects,
  isOpen,
  onOpenChange,
}: HabitAddModalProps) {
  const [name, setName] = useState("");
  const [times, setTimes] = useState("1");
  const [period, setPeriod] = useState<HabitPeriod>(HabitPeriod.Week);
  const [projectId, setProjectId] = useState<string>(projects?.[0]?.id ?? "");
  const [activeDays, setActiveDays] = useState<number[]>(ALL_DAYS);
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay | undefined>(undefined);

  function reset() {
    setName("");
    setTimes("1");
    setPeriod(HabitPeriod.Week);
    setProjectId(projects?.[0]?.id ?? "");
    setActiveDays(ALL_DAYS);
    setTimeOfDay(undefined);
  }

  function toggleDay(day: number) {
    setActiveDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // at least one must remain
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  function handleSave(close: () => void) {
    const trimmed = name.trim();
    const n = Number(times);
    if (!trimmed || !Number.isFinite(n) || n <= 0) return;
    if (projects && !projectId) return;
    const days = period === HabitPeriod.Day && activeDays.length < 7 ? activeDays : undefined;
    onSubmit(trimmed, n, period, projects ? projectId : undefined, days, timeOfDay);
    reset();
    close();
  }

  const isValid =
    Boolean(name.trim()) &&
    Number(times) > 0 &&
    (!projects || Boolean(projectId));

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
                          value={period}
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
                      {period === HabitPeriod.Day && (
                        <div className="mt-4">
                          <Label>Active days</Label>
                          <div className="mt-1 flex gap-1">
                            {WEEKDAY_LABELS.map((label, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => toggleDay(i)}
                                className={[
                                  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-colors",
                                  activeDays.includes(i)
                                    ? "bg-purple-500 text-white"
                                    : "bg-foreground/10 text-foreground/50 hover:bg-foreground/20",
                                ].join(" ")}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <Label>Time of day</Label>
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {(["morning", "afternoon", "evening"] as HabitTimeOfDay[]).map((tod) => (
                            <button
                              key={tod}
                              type="button"
                              onClick={() => setTimeOfDay((prev) => prev === tod ? undefined : tod)}
                              className={[
                                "cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                                timeOfDay === tod
                                  ? "bg-purple-500 text-white"
                                  : "bg-foreground/10 text-foreground/50 hover:bg-foreground/20",
                              ].join(" ")}
                            >
                              {tod.charAt(0).toUpperCase() + tod.slice(1)}
                            </button>
                          ))}
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
