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
import { workspaceRepository } from "../../repositories";
import { workspaceStore } from "../../stores/workspace";
import { auth } from "../../config/firebase";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceModal({
  open,
  onOpenChange,
}: CreateWorkspaceModalProps) {
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
    const workspaceId = await workspaceRepository.createWorkspace(
      user.uid,
      name.trim(),
    );
    workspaceStore.setActiveWorkspace(workspaceId);
    state.close();
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>New workspace</Modal.Heading>
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
                  <TextField name="workspaceName">
                    <Label>Workspace name</Label>
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
