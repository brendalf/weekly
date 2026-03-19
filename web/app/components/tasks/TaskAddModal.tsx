"use client";

import { ReactElement, useState } from "react";
import {
  Modal,
  Button,
  Input,
  Label,
  TextField,
  Surface,
  Select,
  ListBox,
} from "@heroui/react";
import { Check } from "@gravity-ui/icons";
import { TaskScope } from "@weekly/domain";

interface TaskAddModalProps {
  onSubmit: (title: string, projectId?: string, scope?: TaskScope) => void;
  trigger?: ReactElement;
  projects?: { id: string; name: string }[];
}

const SCOPE_OPTIONS: { value: TaskScope; label: string }[] = [
  { value: "day", label: "This day" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export function TaskAddModal({
  onSubmit,
  trigger,
  projects,
}: TaskAddModalProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(projects?.[0]?.id ?? "");
  const [scope, setScope] = useState<TaskScope>("week");

  function handleSave(close: () => void) {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (projects && !projectId) return;
    onSubmit(trimmed, projects ? projectId : undefined, scope);
    setTitle("");
    setProjectId(projects?.[0]?.id ?? "");
    setScope("week");
    close();
  }

  return (
    <Modal
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTitle("");
          setProjectId(projects?.[0]?.id ?? "");
          setScope("week");
        }
      }}
    >
      {trigger ?? <Button size="sm">Add task</Button>}
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Add task</Modal.Heading>
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
                      <TextField name="title">
                        <Label>Title</Label>
                        <Input
                          placeholder="e.g. Read a book"
                          value={title}
                          variant="secondary"
                          onChange={(e) => setTitle(e.target.value)}
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
                      <div className="mt-4">
                        <Label>Scope</Label>
                        <div className="mt-1 flex gap-1">
                          {SCOPE_OPTIONS.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setScope(value)}
                              className={[
                                "flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                                scope === value
                                  ? "bg-purple-500 text-white"
                                  : "bg-foreground/10 text-foreground hover:bg-foreground/20",
                              ].join(" ")}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </form>
                  </Surface>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    isDisabled={
                      !title.trim() || (Boolean(projects?.length) && !projectId)
                    }
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
