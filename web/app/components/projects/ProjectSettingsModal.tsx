"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Input,
  TextField,
  Surface,
  useOverlayState,
} from "@heroui/react";
import { TrashBin, Pencil, Xmark, Check, PersonPlus } from "@gravity-ui/icons";
import type { Project } from "@weekly/domain";
import { projectRepository } from "../../repositories";
import { auth } from "../../config/firebase";
import { projectStore } from "../../stores/project";

interface ProjectSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function ProjectSettingsModal({
  open,
  onOpenChange,
  project,
}: ProjectSettingsModalProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const currentUser = auth.currentUser;
  const isOwner = currentUser?.uid === project.ownerId;

  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) setEditing(false);
      onOpenChange(isOpen);
    },
  });

  const inviteState = useOverlayState({
    isOpen: inviteModalOpen,
    onOpenChange: setInviteModalOpen,
  });

  async function handleRename() {
    if (!editName.trim() || editName === project.name) return;
    await projectRepository.renameProject(project.id, editName.trim());
    setEditing(false);
  }

  function startEditing() {
    setEditName(project.name);
    setEditing(true);
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !currentUser) return;
    await projectRepository.inviteMember(
      project.id,
      currentUser.uid,
      currentUser.displayName ?? "User",
      inviteEmail.trim().toLowerCase(),
    );
    setInviteEmail("");
    inviteState.close();
  }

  async function handleDelete() {
    await projectRepository.deleteProject(project.id);
    projectStore.setActiveProject(null);
    state.close();
  }

  async function handleLeave() {
    if (!currentUser) return;
    await projectRepository.removeMember(project.id, currentUser.uid);
    projectStore.setActiveProject(null);
    state.close();
  }

  async function handleRemoveMember(memberId: string) {
    await projectRepository.removeMember(project.id, memberId);
  }

  return (
    <>
      <Modal state={state}>
        <Modal.Backdrop variant="blur">
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                {editing ? (
                  <div className="flex items-center gap-2 w-full pr-8">
                    <TextField name="editName" className="flex-1">
                      <Input
                        value={editName}
                        variant="secondary"
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") setEditing(false);
                        }}
                      />
                    </TextField>
                    <Button
                      variant="ghost"
                      size="sm"
                      isIconOnly
                      onPress={() => setEditing(false)}
                    >
                      <Xmark />
                    </Button>
                    <Button
                      size="sm"
                      isIconOnly
                      isDisabled={!editName.trim() || editName === project.name}
                      onPress={handleRename}
                    >
                      <Check />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pr-8">
                    <Modal.Heading>{project.name}</Modal.Heading>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        onPress={startEditing}
                        aria-label="Edit name"
                      >
                        <Pencil />
                      </Button>
                    )}
                  </div>
                )}
              </Modal.Header>

              <Modal.Body className="p-1 flex flex-col gap-4">
                {/* Members list */}
                <Surface variant="default">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground/60">
                        Members
                      </p>
                      {isOwner && (
                        <Button
                          size="sm"
                          isIconOnly
                          variant="ghost"
                          aria-label="Add member"
                          onPress={() => setInviteModalOpen(true)}
                        >
                          <PersonPlus />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {project.members.map((memberId) => (
                        <div
                          key={memberId}
                          className="flex items-center justify-between rounded-lg border border-foreground/10 bg-background px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-foreground truncate max-w-40">
                              {memberId === currentUser?.uid
                                ? "You"
                                : memberId.slice(0, 8) + "…"}
                            </span>
                            {memberId === project.ownerId && (
                              <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-500">
                                owner
                              </span>
                            )}
                          </div>
                          {isOwner && memberId !== currentUser?.uid && (
                            <Button
                              size="sm"
                              isIconOnly
                              variant="ghost"
                              aria-label="Remove member"
                              onPress={() => handleRemoveMember(memberId)}
                              className="text-foreground/30 hover:text-red-500"
                            >
                              <Xmark />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pending invites */}
                    {project.pendingInviteEmails.length > 0 && (
                      <>
                        <p className="mt-2 text-xs font-medium text-foreground/60">
                          Pending invites
                        </p>
                        <div className="flex flex-col gap-1">
                          {project.pendingInviteEmails.map((email) => (
                            <div
                              key={email}
                              className="flex items-center justify-between rounded-lg border border-foreground/10 bg-background px-3 py-2"
                            >
                              <span className="text-xs text-foreground">
                                {email}
                              </span>
                              <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground/50">
                                pending
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Surface>
              </Modal.Body>

              <Modal.Footer>
                {isOwner ? (
                  <Button
                    variant="danger"
                    isIconOnly
                    aria-label="Delete project"
                    onPress={handleDelete}
                  >
                    <TrashBin />
                  </Button>
                ) : (
                  <Button variant="danger" onPress={handleLeave}>
                    Leave Project
                  </Button>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Invite member modal */}
      <Modal state={inviteState}>
        <Modal.Backdrop variant="blur">
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Invite member</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="p-1">
                <Surface variant="default">
                  <form
                    className="flex flex-col"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleInvite();
                    }}
                  >
                    <TextField name="inviteEmail">
                      <Input
                        type="email"
                        value={inviteEmail}
                        variant="secondary"
                        placeholder="user@example.com"
                        onChange={(e) => setInviteEmail(e.target.value)}
                        autoFocus
                      />
                    </TextField>
                  </form>
                </Surface>
              </Modal.Body>
              <Modal.Footer>
                <Button isDisabled={!inviteEmail.trim()} onPress={handleInvite}>
                  <Check />
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
