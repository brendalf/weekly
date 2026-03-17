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

interface TaskAddModalProps {
  onSubmit: (title: string, projectId?: string) => void;
  trigger?: ReactElement;
  projects?: { id: string; name: string }[];
}

export function TaskAddModal({
  onSubmit,
  trigger,
  projects,
}: TaskAddModalProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(projects?.[0]?.id ?? "");

  function handleSave(close: () => void) {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (projects && !projectId) return;
    onSubmit(trimmed, projects ? projectId : undefined);
    setTitle("");
    setProjectId(projects?.[0]?.id ?? "");
    close();
  }

  return (
    <Modal
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTitle("");
          setProjectId(projects?.[0]?.id ?? "");
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
