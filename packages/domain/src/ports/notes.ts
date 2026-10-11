import type { Note } from '../models/note';
import type { Unsubscribe } from './types';

export interface NoteRepository {
  subscribeNotes(onNotes: (notes: Note[]) => void): Unsubscribe;
  addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateNote(
    noteId: string,
    updates: { title?: string; body?: string; pinned?: boolean },
  ): Promise<void>;
  deleteNote(noteId: string): Promise<void>;
}
