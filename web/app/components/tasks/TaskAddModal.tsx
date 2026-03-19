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
import { TaskScope } from "@weekly/domain";
import { ScopeSelector } from "./ScopeSelector";
import { ProjectField } from "../general/ProjectField";

interface TaskAddModalProps {
  onSubmit: (title: string, projectId?: string, scope?: TaskScope) => void;
  trigger?: ReactElement;
  projects?: { id: string; name: string }[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskAddModal({
  onSubmit,
  trigger,
  projects,
  isOpen,
  onOpenChange,
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
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setTitle("");
          setProjectId(projects?.[0]?.id ?? "");
          setScope("week");
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
                      {projects && (
                        <ProjectField
                          projects={projects}
                          value={projectId}
                          onChange={setProjectId}
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
