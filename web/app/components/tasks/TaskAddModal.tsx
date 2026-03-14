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

interface TaskAddModalProps {
  onSubmit: (title: string) => void;
  trigger?: ReactElement;
}

export function TaskAddModal({ onSubmit, trigger }: TaskAddModalProps) {
  const [title, setTitle] = useState("");

  function handleSave(close: () => void) {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setTitle("");
    close();
  }

  return (
    <Modal onOpenChange={(isOpen) => { if (!isOpen) setTitle(""); }}>
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
                      onSubmit={(e) => { e.preventDefault(); handleSave(close); }}
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
                    </form>
                  </Surface>
                </Modal.Body>
                <Modal.Footer>
                  <Button isDisabled={!title.trim()} onPress={() => handleSave(close)}>
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
