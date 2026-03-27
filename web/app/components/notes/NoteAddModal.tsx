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
import { auth } from "../../config/firebase";
import type { NoteRepository } from "@weekly/domain";

interface NoteAddModalProps {
  weekKey: string;
  noteRepo: NoteRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteAddModal({ weekKey, noteRepo, open, onOpenChange }: NoteAddModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setTitle("");
        setBody("");
      }
      onOpenChange(isOpen);
    },
  });

  async function handleAdd() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const user = auth.currentUser;
    if (!user) return;
    await noteRepo.addNote(weekKey, {
      title: trimmedTitle,
      body: body.trim(),
      authorId: user.uid,
      authorDisplayName: user.displayName ?? "User",
    });
    setTitle("");
    setBody("");
    state.close();
  }

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
              <Button isDisabled={!title.trim()} onPress={handleAdd}>
                <Check />
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
