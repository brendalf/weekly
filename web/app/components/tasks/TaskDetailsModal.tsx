"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Surface,
  useOverlayState,
  Input,
  TextField,
} from "@heroui/react";
import { TrashBin, Pencil, Xmark, Check } from "@gravity-ui/icons";
import { Task } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

export function TaskDetailsModal({
  open,
  onOpenChange,
  task,
}: TaskDetailsModalProps) {
  const { getTaskRepos } = useRepositoryContext();
  const repos = getTaskRepos(task.id);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) setEditing(false);
      onOpenChange(isOpen);
    },
  });

  async function handleDelete() {
    if (!repos) return;
    await repos.task.deleteTask(task.id);
    state.close();
  }

  async function handleSave() {
    if (!repos) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    await repos.task.updateTaskTitle(task.id, trimmed);
    setEditing(false);
  }

  function startEditing() {
    setEditTitle(task.title);
    setEditing(true);
  }

  const isEditValid = Boolean(editTitle.trim());

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              {editing ? (
                <div className="w-full pr-8">
                  <TextField name="editTitle">
                    <Input
                      value={editTitle}
                      variant="secondary"
                      autoFocus
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                      }}
                    />
                  </TextField>
                </div>
              ) : (
                <Modal.Heading>{task.title}</Modal.Heading>
              )}
            </Modal.Header>

            <Modal.Body className="p-1">
              <Surface variant="default">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-foreground/50">
                    Created{" "}
                    {new Date(task.createdAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-foreground/50">
                    Status: {task.completed ? "Completed" : "Pending"}
                  </p>
                </div>
              </Surface>
            </Modal.Body>

            <Modal.Footer>
              {editing ? (
                <>
                  <Button variant="ghost" onPress={() => setEditing(false)}>
                    <Xmark />
                  </Button>
                  <Button
                    className="bg-purple-500"
                    isDisabled={!isEditValid}
                    onPress={handleSave}
                  >
                    <Check />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onPress={startEditing}>
                    <Pencil />
                  </Button>
                  <Button variant="danger" onPress={handleDelete}>
                    <TrashBin />
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
