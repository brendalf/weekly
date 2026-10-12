"use client";

import { useCallback, useState } from "react";
import { Button } from "@heroui/react";
import { Period, type HabitTimeOfDay } from "@weekly/domain";
import { toast } from "sonner";
import {
  groupShortcuts,
  useKeyboardShortcuts,
  type Shortcut,
} from "../../hooks/useKeyboardShortcuts";
import { focusAdjacentRow } from "../../hooks/useRowKeys";
import { useActivityLog } from "../../hooks/useActivityLog";
import { useRepositoryContext } from "../../contexts/RepositoryContext";
import { calendarStore } from "../../stores/calendar";
import {
  clearGlobalSearch,
  focusGlobalSearch,
  searchStore,
} from "../../stores/search";
import { useWorkspaceSelection } from "../../stores/workspace";
import { useAppData } from "../shell/AppDataProvider";
import { HabitAddModal } from "../habits/HabitAddModal";
import { TaskAddModal } from "../tasks/TaskAddModal";
import { NoteAddModal } from "../notes/NoteAddModal";
import { ShortcutCheatsheet } from "./ShortcutCheatsheet";

/**
 * The app's keyboard layer (PLAN WS12 / DIRECTION §7). Mounted once in the
 * `/app` shell; renders nothing until a shortcut asks it to.
 *
 * ## Why the add modals live here
 *
 * `h` / `t` / `o` / `n` have to work from **every** route — "new task" is the
 * most common action in the product and it should not depend on standing on
 * `/app/tasks` first. Each route also has its own "Add task" button and its
 * own modal; those stay, because a button needs to be where the list is. This
 * component owns the *keyboard* path to the same three flows, so the shortcut
 * never depends on a particular route being mounted.
 *
 * ## What is not bound here
 *
 * `Enter` is the row link's own activation and `x` / `Space` are handled by
 * the row (`hooks/useRowKeys`) — a global listener would have to guess which
 * row the user means, and the row already knows. They appear in the
 * cheatsheet because the user does not care where a key is implemented.
 *
 * ## `/` is bound twice, for now
 *
 * `ShellHeader` carries its own `/` listener from WS11, written to bail on
 * `defaultPrevented` so the two can coexist for a release. Both call
 * `focusGlobalSearch()`, so whichever runs first wins and the other no-ops.
 * Deleting that effect is a one-line WS11/WS15 follow-up; this is the binding
 * that should survive.
 */

/** Rows and detail keys that are implemented elsewhere but belong in the `?` list. */
const DOCUMENTED_ELSEWHERE: Shortcut[] = [
  {
    keys: ["Enter"],
    group: "This row",
    label: "Open the focused row",
    run: () => {},
  },
  {
    keys: ["x"],
    display: ["x", " "],
    group: "This row",
    label: "Toggle the focused row",
    run: () => {},
  },
];

/**
 * The trigger slot for a modal that is opened by a key, not a click.
 *
 * It has to be a real pressable (React Aria's `PressResponder` warns without
 * one) and it has to be focusable (that is where focus returns when the
 * dialog closes), but it must never be visible, tabbable, or announced.
 */
function HiddenTrigger() {
  return (
    <Button className="sr-only" aria-hidden excludeFromTabOrder>
      Open
    </Button>
  );
}

export function KeyboardShortcuts() {
  const { pickerWorkspaces, addNote } = useAppData();
  const { activeRepos, getWorkspaceRepos } = useRepositoryContext();
  const logActivity = useActivityLog();
  const selection = useWorkspaceSelection();

  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  /* ------------------------------------------------------------ add flows -- */

  const handleAddTask = useCallback(
    (title: string, workspaceId?: string, scope?: Period) => {
      const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
      if (!repos) return;
      const selectedDayISO = calendarStore.getState().selectedDayISO;
      repos.task
        .addTask(title, scope, selectedDayISO ? new Date(selectedDayISO) : new Date())
        .then((taskId) => {
          logActivity(workspaceId ?? selection.singleId, {
            type: "task_added",
            itemId: taskId,
            itemName: title,
          });
        })
        .catch(() => toast.error("Failed to add task. Please try again."));
    },
    [activeRepos, getWorkspaceRepos, logActivity, selection.singleId],
  );

  const handleAddHabit = useCallback(
    (
      name: string,
      times: number,
      period: Period,
      workspaceId?: string,
      activeDays?: number[],
      timeOfDay?: HabitTimeOfDay,
    ) => {
      const repos = workspaceId ? getWorkspaceRepos(workspaceId) : activeRepos;
      if (!repos) return;
      const selectedDayISO = calendarStore.getState().selectedDayISO;
      repos.habit
        .addHabit(
          name,
          times,
          period,
          selectedDayISO ? new Date(selectedDayISO) : new Date(),
          activeDays,
          timeOfDay,
        )
        .then((habitId) => {
          logActivity(workspaceId ?? selection.singleId, {
            type: "habit_added",
            itemId: habitId,
            itemName: name,
          });
        })
        .catch(() => toast.error("Failed to add habit. Please try again."));
    },
    [activeRepos, getWorkspaceRepos, logActivity, selection.singleId],
  );

  /* -------------------------------------------------------------- filter -- */

  /**
   * `/` and `Esc` go through WS11's `searchStore`, which exposes exactly these
   * two entry points. `focusGlobalSearch()` returns `false` on a route with
   * nothing to filter (`/app/review`, `/app/settings`) so the key falls
   * through instead of being swallowed.
   */
  const focusFilter = useCallback(() => focusGlobalSearch(), []);

  /**
   * `Esc` outside a field: clear the filter if it holds anything, otherwise
   * step out of the focused row. A dialog, a menu and the filter input all
   * handle their own `Esc` and never reach this.
   */
  const escape = useCallback(() => {
    if (searchStore.getState().query) {
      clearGlobalSearch();
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, []);

  /* ----------------------------------------------------------- bindings -- */

  const bindings: Shortcut[] = [
    {
      keys: ["/"],
      group: "Navigate",
      label: "Focus the filter",
      run: focusFilter,
    },
    {
      keys: ["ArrowLeft"],
      group: "Navigate",
      label: "Previous week",
      run: () => calendarStore.prevWeek(),
    },
    {
      keys: ["ArrowRight"],
      group: "Navigate",
      label: "Next week",
      run: () => calendarStore.nextWeek(),
    },
    {
      keys: ["j"],
      group: "Rows",
      label: "Next row",
      run: () => focusAdjacentRow(1),
    },
    {
      keys: ["k"],
      group: "Rows",
      label: "Previous row",
      run: () => focusAdjacentRow(-1),
    },
    ...DOCUMENTED_ELSEWHERE,
    {
      keys: ["n", "t"],
      group: "Create",
      label: "New task",
      run: () => setTaskOpen(true),
    },
    {
      keys: ["h"],
      group: "Create",
      label: "New habit",
      run: () => setHabitOpen(true),
    },
    {
      keys: ["o"],
      group: "Create",
      label: "New note",
      run: () => setNoteOpen(true),
    },
    {
      keys: ["?"],
      group: "Help",
      label: "This cheatsheet",
      // Not `allowInOverlay`: opening it from inside another dialog would
      // stack a modal on a modal (DIRECTION §5). `Esc` closes it.
      run: () => setCheatsheetOpen(true),
    },
    {
      keys: ["Escape"],
      group: "Help",
      label: "Clear the filter / leave the row",
      // Never `preventDefault`: a dialog, a menu and the filter field all
      // handle `Esc` themselves and must keep doing so.
      passive: true,
      run: escape,
    },
  ];

  // `DOCUMENTED_ELSEWHERE` is for the cheatsheet only — binding `Enter` and
  // `x` globally would steal them from the row that already handles them.
  const active = bindings.filter(
    (binding) => !DOCUMENTED_ELSEWHERE.includes(binding),
  );
  useKeyboardShortcuts(active);

  return (
    <>
      <ShortcutCheatsheet
        open={cheatsheetOpen}
        onOpenChange={setCheatsheetOpen}
        groups={groupShortcuts(bindings)}
      />

      {/* Controlled by the shortcut, not by a button. The trigger slot still
          gets a real (visually hidden, AT-hidden, untabbable) button: React
          Aria returns focus to the trigger on close, and without one focus
          would land on `<body>` — which is exactly the user these shortcuts
          exist for. Each route keeps its own visible "Add …" button. */}
      <TaskAddModal
        isOpen={taskOpen}
        onOpenChange={setTaskOpen}
        onSubmit={handleAddTask}
        workspaces={pickerWorkspaces}
        trigger={<HiddenTrigger />}
      />
      <HabitAddModal
        isOpen={habitOpen}
        onOpenChange={setHabitOpen}
        onSubmit={handleAddHabit}
        workspaces={pickerWorkspaces}
        trigger={<HiddenTrigger />}
      />
      <NoteAddModal
        open={noteOpen}
        onOpenChange={setNoteOpen}
        workspaces={pickerWorkspaces}
        onSubmit={(title, body, workspaceId) => {
          addNote(title, body, workspaceId).catch(() =>
            toast.error("Failed to save note. Please try again."),
          );
        }}
      />
    </>
  );
}
