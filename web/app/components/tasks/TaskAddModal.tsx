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
import { Check } from "@gravity-ui/icons";
import { Period } from "@weekly/domain";
import { ScopeSelector } from "./ScopeSelector";
import { WorkspaceField } from "../general/WorkspaceField";

interface TaskAddModalProps {
  onSubmit: (title: string, workspaceId?: string, scope?: Period) => void;
  trigger?: ReactElement;
  workspaces?: { id: string; name: string }[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskAddModal({
  onSubmit,
  trigger,
  workspaces,
  isOpen,
  onOpenChange,
}: TaskAddModalProps) {
  const [title, setTitle] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces?.[0]?.id ?? "");
  const [scope, setScope] = useState<Period>(Period.WEEK);

  function handleSave(close: () => void) {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (workspaces && !workspaceId) return;
    onSubmit(trimmed, workspaces ? workspaceId : undefined, scope);
    setTitle("");
    setWorkspaceId(workspaces?.[0]?.id ?? "");
    setScope(Period.WEEK);
    close();
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setTitle("");
          setWorkspaceId(workspaces?.[0]?.id ?? "");
          setScope(Period.WEEK);
        }
        onOpenChange?.(open);
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
                      {workspaces && (
                        <WorkspaceField
                          workspaces={workspaces}
                          value={workspaceId}
                          onChange={setWorkspaceId}
                        />
                      )}
                      <div className="mt-4">
                        <Label>Scope</Label>
                        <div className="mt-1">
                          <ScopeSelector
                            value={scope}
                            onChange={setScope}
                            fullWidth
                          />
                        </div>
                      </div>
                    </form>
                  </Surface>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    isDisabled={
                      !title.trim() || (Boolean(workspaces?.length) && !workspaceId)
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
