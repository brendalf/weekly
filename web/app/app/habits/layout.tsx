import type { ReactNode } from "react";
import { HabitsList } from "./HabitsList";

/**
 * Section layout for `/app/habits` — **the deep-link pattern for every detail
 * panel in the app** (DIRECTION §5). `/app/tasks` and `/app/notes` copy it.
 *
 * The list is rendered *here* rather than in `page.tsx`, and `children` is the
 * detail-panel slot:
 *
 * - `page.tsx` → the index. Renders nothing; the list above is the page.
 * - `[id]/page.tsx` → the `DetailPanel` for one habit.
 *
 * Why the layout owns the list: a sibling `page.tsx` + `[id]/page.tsx` pair
 * live at the same position in the tree, so routing to a detail would unmount
 * the list, tear down its subscriptions, and lose its scroll position — and
 * DIRECTION §5 asks for a panel *beside* a page that stays interactive.
 * Rendering the list in the layout keeps it mounted across `/app/habits` ↔
 * `/app/habits/:id`, which also makes the browser Back button the panel's close
 * button for free.
 */
export default function HabitsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HabitsList />
      {children}
    </>
  );
}
