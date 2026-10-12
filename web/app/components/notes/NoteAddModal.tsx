"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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
import { useIsTouch } from "../../hooks/useIsTouch";

interface NoteAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces?: { id: string; name: string }[];
  onSubmit: (title: string, body: string, workspaceId?: string) => void;
}

export function NoteAddModal({ open, onOpenChange, workspaces, onSubmit }: NoteAddModalProps) {
  const isTouch = useIsTouch();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces?.[0]?.id ?? "");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Auto-grow the body textarea instead of a fixed `rows` box.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body, open]);

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

  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  const isValid = Boolean(title.trim()) && (!workspaces || Boolean(workspaceId));

  return (
    <Modal state={state}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="bottom" size="sm" className="p-0 sm:p-10">
          <Modal.Dialog className="h-full max-h-full rounded-t-3xl rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[85dvh] sm:rounded-3xl sm:p-6 sm:pb-6">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="pr-10">Add note</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-1">
              <Surface variant="default">
                <form
                  className="flex flex-col gap-3"
                  onKeyDown={handleKeyDown}
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
                      autoFocus={!isTouch}
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
                      ref={bodyRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write something… (optional)"
                      rows={4}
                      className="max-h-[45vh] min-h-28 w-full resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
                    />
                  </div>
                </form>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="min-h-11"
                isDisabled={!isValid}
                aria-label="Add note"
                onPress={handleAdd}
              >
                <Check />
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
