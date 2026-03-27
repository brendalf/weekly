import type { Note } from '../models/note';
import type { Unsubscribe } from './types';

export interface NoteRepository {
  subscribeNotes(weekKey: string, onNotes: (notes: Note[]) => void): Unsubscribe;
  addNote(weekKey: string, note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateNote(weekKey: string, noteId: string, title: string, body: string): Promise<void>;
  deleteNote(weekKey: string, noteId: string): Promise<void>;
}
