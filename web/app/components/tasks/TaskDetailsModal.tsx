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
import { Task, TaskScope } from "@weekly/domain";
import { useRepositoryContext } from "../../contexts/RepositoryContext";

const SCOPE_OPTIONS: { value: TaskScope; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const SCOPE_COLORS: Record<TaskScope, string> = {
  day: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  week: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  month: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
};

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
  const [editScope, setEditScope] = useState<TaskScope>(task.scope ?? "week");

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
    await repos.task.updateTask(task.id, { title: trimmed, scope: editScope });
    setEditing(false);
  }

  function startEditing() {
    setEditTitle(task.title);
    setEditScope(task.scope ?? "week");
    setEditing(true);
  }

  const isEditValid = Boolean(editTitle.trim());
  const scope = task.scope ?? "week";

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
                <div className="flex flex-col gap-3">
                  {/* Scope */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-foreground/50">Scope</p>
                    {editing ? (
                      <div className="flex gap-1.5">
                        {SCOPE_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setEditScope(value)}
                            className={[
                              "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                              editScope === value
                                ? "bg-purple-500 text-white"
                                : "bg-foreground/10 text-foreground hover:bg-foreground/15",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span
                        className={[
                          "w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                          SCOPE_COLORS[scope],
                        ].join(" ")}
                      >
                        {SCOPE_OPTIONS.find((o) => o.value === scope)?.label}
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col gap-0.5">
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
