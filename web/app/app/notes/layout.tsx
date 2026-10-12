import type { ReactNode } from "react";
import { NotesList } from "./NotesList";

/**
 * Section layout for `/app/notes`. Same shape as `/app/habits` — the list lives
 * here so the detail panel at `[id]/page.tsx` opens beside a list that stays
 * mounted. See `app/habits/layout.tsx` for why.
 */
export default function NotesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NotesList />
      {children}
    </>
  );
}
