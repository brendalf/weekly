import {
  type Firestore,
  type DocumentData,
  type QueryDocumentSnapshot,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import type { Note, NoteRepository } from "@weekly/domain";

type NoteDoc = {
  title?: unknown;
  body?: unknown;
  authorId?: unknown;
  authorDisplayName?: unknown;
  pinned?: unknown;
  createdAt?: { toDate?: () => Date };
  updatedAt?: { toDate?: () => Date };
};

function toNote(id: string, data: NoteDoc): Note {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorDisplayName:
      typeof data.authorDisplayName === "string" ? data.authorDisplayName : "",
    pinned: typeof data.pinned === "boolean" ? data.pinned : undefined,
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

export function createNoteRepository(
  db: Firestore,
  workspaceId: string,
): NoteRepository {
  function notesCol() {
    return collection(db, "workspaces", workspaceId, "notes");
  }

  return {
    subscribeNotes(onNotes: (notes: Note[]) => void) {
      const q = query(notesCol(), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snap) => {
        const notes = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) =>
          toNote(d.id, d.data() as NoteDoc),
        );
        onNotes(notes);
      });
    },

    async addNote(note: Omit<Note, "id" | "createdAt" | "updatedAt">) {
      const ref = await addDoc(notesCol(), {
        ...note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },

    async updateNote(
      noteId: string,
      updates: { title?: string; body?: string; pinned?: boolean },
    ) {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.body !== undefined) payload.body = updates.body;
      if (updates.pinned !== undefined) payload.pinned = updates.pinned;
      payload.updatedAt = serverTimestamp();
      await updateDoc(doc(notesCol(), noteId), payload);
    },

    async deleteNote(noteId: string) {
      await deleteDoc(doc(notesCol(), noteId));
    },
  };
}
