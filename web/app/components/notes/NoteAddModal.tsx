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
import { Check } from "@gravity-ui/icons";
import { WorkspaceField } from "../general/WorkspaceField";

interface NoteAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces?: { id: string; name: string }[];
  onSubmit: (title: string, body: string, workspaceId?: string) => void;
}

export function NoteAddModal({ open, onOpenChange, workspaces, onSubmit }: NoteAddModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces?.[0]?.id ?? "");

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setTitle("");
        setBody("");
        setWorkspaceId(workspaces?.[0]?.id ?? "");
      }
      onOpenChange(isOpen);
    },
  });

  function handleAdd() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (workspaces && !workspaceId) return;
    onSubmit(trimmedTitle, body.trim(), workspaces ? workspaceId : undefined);
    setTitle("");
    setBody("");
    setWorkspaceId(workspaces?.[0]?.id ?? "");
    state.close();
  }

  const isValid = Boolean(title.trim()) && (!workspaces || Boolean(workspaceId));

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Add note</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdd();
                  }}
                >
                  <TextField name="noteTitle">
                    <Label>Title</Label>
                    <Input
                      placeholder="Note title"
                      value={title}
                      variant="secondary"
                      autoFocus
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </TextField>
                  {workspaces && (
                    <WorkspaceField
                      workspaces={workspaces}
                      value={workspaceId}
                      onChange={setWorkspaceId}
                    />
                  )}
                  <div className="flex flex-col gap-1">
                    <Label>Body</Label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write something… (optional)"
                      rows={4}
                      className="w-full resize-none rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30"
                    />
                  </div>
                </form>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={!isValid} onPress={handleAdd}>
                <Check />
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
