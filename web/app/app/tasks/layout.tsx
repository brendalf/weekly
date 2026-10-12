import type { ReactNode } from "react";
import { TasksList } from "./TasksList";

/**
 * Section layout for `/app/tasks`. Same shape as `/app/habits` — the list lives
 * here so the detail panel at `[id]/page.tsx` opens beside a list that stays
 * mounted. See `app/habits/layout.tsx` for why.
 */
export default function TasksLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TasksList />
      {children}
    </>
  );
}
