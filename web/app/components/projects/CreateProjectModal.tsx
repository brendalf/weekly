"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Input,
  Label,
  TextField,
  Surface,
  useOverlayState,
} from "@heroui/react";
import { projectRepository } from "../../repositories";
import { projectStore } from "../../stores/project";
import { auth } from "../../config/firebase";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) setName("");
      onOpenChange(isOpen);
    },
  });

  async function handleCreate() {
    const user = auth.currentUser;
    if (!user || !name.trim()) return;
    const projectId = await projectRepository.createProject(
      user.uid,
      name.trim(),
    );
    projectStore.setActiveProject(projectId);
    state.close();
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>New project</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
                <form
                  className="flex flex-col"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreate();
                  }}
                >
                  <TextField name="projectName">
                    <Label>Project name</Label>
                    <Input
                      placeholder="e.g. Work"
                      value={name}
                      variant="secondary"
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </TextField>
                </form>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={!name.trim()} onPress={handleCreate}>
                Create
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
