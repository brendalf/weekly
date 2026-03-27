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
  function itemsCol(weekKey: string) {
    return collection(
      db,
      "workspaces",
      workspaceId,
      "weekNotes",
      weekKey,
      "items",
    );
  }

  return {
    subscribeNotes(weekKey: string, onNotes: (notes: Note[]) => void) {
      const q = query(itemsCol(weekKey), orderBy("createdAt", "asc"));
      return onSnapshot(q, (snap) => {
        const notes = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) =>
          toNote(d.id, d.data() as NoteDoc),
        );
        onNotes(notes);
      });
    },

    async addNote(weekKey: string, note: Omit<Note, "id" | "createdAt" | "updatedAt">) {
      const ref = await addDoc(itemsCol(weekKey), {
        ...note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },

    async updateNote(weekKey: string, noteId: string, title: string, body: string) {
      await updateDoc(doc(itemsCol(weekKey), noteId), {
        title,
        body,
        updatedAt: serverTimestamp(),
      });
    },

    async deleteNote(weekKey: string, noteId: string) {
      await deleteDoc(doc(itemsCol(weekKey), noteId));
    },
  };
}
