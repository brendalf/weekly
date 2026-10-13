"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { toast } from "sonner";
import {
  compareNotes,
  type ActivityNotification,
  type Habit,
  type Note,
  type Task,
  type Workspace,
} from "@weekly/domain";
import { auth } from "../../config/firebase";
import {
  db,
  userPreferencesRepository,
  workspaceRepository,
} from "../../repositories";
import { RepositoryContext } from "../../contexts/RepositoryContext";
import { useWorkspaceData } from "../../hooks/useWorkspaceData";
import { useActivityLog } from "../../hooks/useActivityLog";
import {
  useWorkspaceSelection,
  useWorkspaceStore,
  workspaceStore,
} from "../../stores/workspace";
import { ThemeContext } from "../../providers";

/**
 * Every subscription the authenticated product needs, mounted once for the
 * whole `/app` shell (PLAN WS3).
 *
 * All of this used to live in `app/app/page.tsx`, which meant it belonged to
 * one screen. Now it belongs to the layout, so a route is just a view over data
 * that is already there: no route re-subscribes, and navigating between
 * `/app/week` and `/app/habits` costs nothing.
 *
 * What is wired here:
 * - **auth** (`onAuthStateChanged`) — plus the sign-out redirect;
 * - **workspaces** — including the personal-workspace bootstrap on first login;
 * - **pending invites** and **activity notifications** → `workspaceStore`;
 * - **user preferences** — theme, display toggles, last-read timestamp, and the
 *   persisted workspace selection;
 * - **habits / tasks** via `useWorkspaceData` (unchanged contract) and
 *   **notes**, which `/app/notes` and `/app/review` both read.
 *
 * Two guards here exist for real races and must survive refactors:
 * `personalWorkspaceCreatedRef` and `selectionHydratedRef` — see their call
 * sites.
 *
 * The `layout` / `innerLayout` preferences are deliberately **not** read
 * (DIRECTION §3, "what dies"). The fields stay in `UserPreferences` for one
 * release so older clients keep working; nothing consumes them.
 */

/** A note plus the workspace it came from — notes are workspace-scoped. */
export type NoteEntry = Note & { workspaceId: string };

/** Partial note mutation, mirroring `NoteRepository.updateNote`. */
export interface NoteUpdates {
  title?: string;
  body?: string;
  pinned?: boolean;
}

export interface AppDataValue {
  /** Firebase user. `null` until auth resolves, and after sign-out. */
  user: User | null;
  /** Convenience alias for `user?.uid`. */
  userId: string | null;
  /** True once `onAuthStateChanged` has fired at least once. */
  authReady: boolean;
  /** True once the workspaces snapshot has arrived (even if empty). */
  workspacesLoaded: boolean;

  /** Every workspace the user belongs to. */
  workspaces: Workspace[];
  /** The workspaces the current selection puts in view. */
  workspacesInView: Workspace[];
  /**
   * `workspacesInView` when more than one is in view, else `undefined` — the
   * exact shape the list/modal components' optional `workspaces` prop expects
   * (present = "show a workspace picker / badge").
   */
  pickerWorkspaces: Workspace[] | undefined;

  /** Habits across every workspace in view. */
  habits: Habit[];
  /** Tasks across every workspace in view. */
  tasks: Task[];
  /** Notes across every workspace in view, pinned first then newest. */
  notes: NoteEntry[];

  /** Display preference: show completed tasks / habits in lists. */
  showCompletedTasks: boolean;
  /** Display preference: show skipped habits in lists. */
  showSkippedHabits: boolean;
  setShowCompletedTasks: (show: boolean) => void;
  setShowSkippedHabits: (show: boolean) => void;

  /** Toggles a task and announces a completion to the workspace feed. */
  toggleTaskCompleted: (taskId: string) => Promise<void>;
  /** Creates a note in `workspaceId` (defaults to the workspace in view). */
  addNote: (
    title: string,
    body: string,
    workspaceId?: string,
  ) => Promise<string | null>;
  /** Patches a note. Rejects so the caller can surface the failure. */
  updateNote: (noteId: string, updates: NoteUpdates) => Promise<void>;
  /** Deletes a note. Failures surface as a toast. */
  deleteNote: (noteId: string) => Promise<void>;
  /** Signs out and returns to the landing page. */
  logout: () => Promise<void>;
}

export const AppDataContext = createContext<AppDataValue | null>(null);

/**
 * The shell's data contract. Route components call this instead of
 * subscribing: `const { habits, tasks } = useAppData()`.
 *
 * Throws outside the `/app` shell, which is the useful failure — a route that
 * needs this data belongs under `/app`.
 */
export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) {
    throw new Error("useAppData must be used inside the /app shell layout");
  }
  return value;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [showCompletedTasks, setShowCompletedTasksState] = useState(true);
  const [showSkippedHabits, setShowSkippedHabitsState] = useState(true);
  const [notes, setNotes] = useState<NoteEntry[]>([]);

  const personalWorkspaceCreatedRef = useRef(false);
  const selectionHydratedRef = useRef(false);
  const lastPersistedSelectionRef = useRef<string | null>(null);

  const { setTheme } = useContext(ThemeContext);
  const logActivity = useActivityLog();

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const selectedWorkspaceIds = useWorkspaceStore((s) => s.selectedWorkspaceIds);
  const selection = useWorkspaceSelection();

  const {
    tasks,
    habits,
    activeRepos,
    getHabitRepos,
    getTaskRepos,
    getWorkspaceRepos,
    getHabitProjectId,
    getTaskProjectId,
  } = useWorkspaceData(db);

  const repositoryValue = useMemo(
    () => ({
      activeRepos,
      getHabitRepos,
      getTaskRepos,
      getWorkspaceRepos,
      getHabitProjectId,
      getTaskProjectId,
    }),
    [
      activeRepos,
      getHabitRepos,
      getTaskRepos,
      getWorkspaceRepos,
      getHabitProjectId,
      getTaskProjectId,
    ],
  );

  /* ---------------------------------------------------------------- auth -- */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setUserId(firebaseUser?.uid ?? null);
      setAuthReady(true);
      if (!firebaseUser) {
        document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
        window.location.assign("/");
      }
    });
    return () => unsub();
  }, []);

  /* --------------------------------------------------------- preferences -- */

  useEffect(() => {
    if (!userId) return;
    return userPreferencesRepository.subscribeUserPreferences(
      userId,
      ({
        theme,
        showCompletedTasks: persistedShowCompleted,
        showSkippedHabits: persistedShowSkipped,
        lastNotificationReadAt,
        selectedWorkspaceIds: persistedSelection,
      }) => {
        setTheme(theme);
        setShowCompletedTasksState(persistedShowCompleted);
        setShowSkippedHabitsState(persistedShowSkipped);
        if (lastNotificationReadAt) {
          workspaceStore.setLastNotificationReadAt(lastNotificationReadAt);
        }
        // Hydrate the selection from the first payload only, so a later
        // preference write does not stomp an in-session change.
        if (!selectionHydratedRef.current) {
          selectionHydratedRef.current = true;
          workspaceStore.setSelectedWorkspaceIds(persistedSelection);
          lastPersistedSelectionRef.current = workspaceStore
            .getState()
            .selectedWorkspaceIds.join(",");
        }
      },
    );
  }, [userId, setTheme]);

  // Persist selection changes.
  useEffect(() => {
    if (!userId || !selectionHydratedRef.current) return;
    const key = selectedWorkspaceIds.join(",");
    if (lastPersistedSelectionRef.current === key) return;
    lastPersistedSelectionRef.current = key;
    userPreferencesRepository
      .updateSelectedWorkspaceIds(userId, selectedWorkspaceIds)
      .catch(() => {
        toast.error("Failed to save workspace selection.");
      });
  }, [userId, selectedWorkspaceIds]);

  /* ---------------------------------------------------------- workspaces -- */

  useEffect(() => {
    if (!userId || !user) return;
    return workspaceRepository.subscribeUserWorkspaces(
      userId,
      (userWorkspaces) => {
        workspaceStore.setWorkspaces(userWorkspaces);
        setWorkspacesLoaded(true);
      },
    );
  }, [userId, user]);

  // Create the Personal workspace on first login, once we know the user really
  // has none (a brand-new user must not race the initial empty snapshot).
  useEffect(() => {
    if (!userId || !workspacesLoaded) return;
    if (workspaces.length > 0 || personalWorkspaceCreatedRef.current) return;
    personalWorkspaceCreatedRef.current = true;
    (async () => {
      try {
        await workspaceRepository.createPersonalWorkspace(userId);
      } catch {
        toast.error("Could not set up your workspace. Please reload the page.");
      }
    })();
  }, [userId, workspacesLoaded, workspaces.length]);

  // Pending invites.
  useEffect(() => {
    if (!user?.email) return;
    return workspaceRepository.subscribeInvites(user.email, (invites) => {
      workspaceStore.setPendingInvites(invites);
    });
  }, [user?.email]);

  // Activity notifications across all workspaces.
  useEffect(() => {
    if (!userId || workspaces.length === 0) return;

    const activitiesPerWorkspace = new Map<string, ActivityNotification[]>();
    const unsubs: (() => void)[] = [];

    for (const workspace of workspaces) {
      unsubs.push(
        workspaceRepository.subscribeWorkspaceActivities(
          workspace.id,
          userId,
          (acts) => {
            activitiesPerWorkspace.set(workspace.id, acts);
            const all = [...activitiesPerWorkspace.values()].flat();
            all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            workspaceStore.setActivityNotifications(all);
          },
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [userId, workspaces]);

  /* --------------------------------------------------------------- notes -- */

  // Stable key: Firestore hands us a fresh array identity on every workspace
  // snapshot, and depending on it would tear down every note listener.
  const workspaceIdsKey = selection.workspaceIds.join(",");

  useEffect(() => {
    const ids = workspaceIdsKey ? workspaceIdsKey.split(",") : [];
    const notesPerWorkspace = new Map<string, NoteEntry[]>();
    const unsubs: (() => void)[] = [];

    for (const workspaceId of ids) {
      const repos = getWorkspaceRepos(workspaceId);
      if (!repos) continue;
      unsubs.push(
        repos.note.subscribeNotes((workspaceNotes) => {
          notesPerWorkspace.set(
            workspaceId,
            workspaceNotes.map((n) => ({ ...n, workspaceId })),
          );
          setNotes([...notesPerWorkspace.values()].flat().sort(compareNotes));
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [workspaceIdsKey, getWorkspaceRepos]);

  // A workspace that just left the selection keeps its notes in state until its
  // listener is replaced, so scope the exposed list by the live selection.
  const scopedNotes = useMemo(() => {
    const ids = new Set(selection.workspaceIds);
    return notes.filter((n) => ids.has(n.workspaceId));
  }, [notes, selection.workspaceIds]);

  /* ------------------------------------------------------------ actions -- */

  const workspacesInView = useMemo(
    () => workspaces.filter((w) => selection.workspaceIds.includes(w.id)),
    [workspaces, selection.workspaceIds],
  );

  const pickerWorkspaces =
    workspacesInView.length > 1 ? workspacesInView : undefined;

  const setShowCompletedTasks = useCallback(
    (show: boolean) => {
      setShowCompletedTasksState(show);
      if (!userId) return;
      userPreferencesRepository
        .updateShowCompletedTasks(userId, show)
        .catch(() => toast.error("Failed to save display preference."));
    },
    [userId],
  );

  const setShowSkippedHabits = useCallback(
    (show: boolean) => {
      setShowSkippedHabitsState(show);
      if (!userId) return;
      userPreferencesRepository
        .updateShowSkippedHabits(userId, show)
        .catch(() => toast.error("Failed to save display preference."));
    },
    [userId],
  );

  const toggleTaskCompleted = useCallback(
    async (taskId: string) => {
      const repos = getTaskRepos(taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (!repos || !task) return;

      const wasCompleted = task.completed;
      await repos.task.toggleTask(task);
      if (wasCompleted) return;
      logActivity(getTaskProjectId(taskId), {
        type: "task_completed",
        itemId: taskId,
        itemName: task.title,
      });
    },
    [getTaskRepos, getTaskProjectId, tasks, logActivity],
  );

  const addNote = useCallback(
    async (title: string, body: string, workspaceId?: string) => {
      const currentUser = auth.currentUser;
      const targetId =
        workspaceId ?? selection.singleId ?? selection.workspaceIds[0] ?? null;
      if (!currentUser || !targetId) return null;
      const repos = getWorkspaceRepos(targetId);
      if (!repos) return null;

      const noteId = await repos.note.addNote({
        title,
        body,
        authorId: currentUser.uid,
        authorDisplayName: currentUser.displayName ?? "User",
      });
      logActivity(targetId, {
        type: "note_added",
        itemId: noteId,
        itemName: title,
      });
      return noteId;
    },
    [getWorkspaceRepos, logActivity, selection.singleId, selection.workspaceIds],
  );

  // No optimistic bookkeeping on the note mutations below: Firestore applies a
  // local write to its own listeners before the round trip, so `subscribeNotes`
  // already repaints immediately and rolls itself back on failure.
  const updateNote = useCallback(
    async (noteId: string, updates: NoteUpdates) => {
      const entry = notes.find((n) => n.id === noteId);
      if (!entry) return;
      const repos = getWorkspaceRepos(entry.workspaceId);
      if (!repos) throw new Error("Workspace unavailable");

      await repos.note.updateNote(noteId, updates);
      if (updates.title !== undefined || updates.body !== undefined) {
        logActivity(entry.workspaceId, {
          type: "note_edited",
          itemId: noteId,
          itemName: updates.title ?? entry.title,
        });
      }
    },
    [notes, getWorkspaceRepos, logActivity],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const entry = notes.find((n) => n.id === noteId);
      if (!entry) return;
      const repos = getWorkspaceRepos(entry.workspaceId);
      if (!repos) return;
      try {
        await repos.note.deleteNote(noteId);
      } catch {
        toast.error("Failed to delete note. Please try again.");
        return;
      }
      logActivity(entry.workspaceId, {
        type: "note_deleted",
        itemId: noteId,
        itemName: entry.title,
      });
    },
    [notes, getWorkspaceRepos, logActivity],
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    document.cookie = "weekly_auth=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.assign("/");
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      user,
      userId,
      authReady,
      workspacesLoaded,
      workspaces,
      workspacesInView,
      pickerWorkspaces,
      habits,
      tasks,
      notes: scopedNotes,
      showCompletedTasks,
      showSkippedHabits,
      setShowCompletedTasks,
      setShowSkippedHabits,
      toggleTaskCompleted,
      addNote,
      updateNote,
      deleteNote,
      logout,
    }),
    [
      user,
      userId,
      authReady,
      workspacesLoaded,
      workspaces,
      workspacesInView,
      pickerWorkspaces,
      habits,
      tasks,
      scopedNotes,
      showCompletedTasks,
      showSkippedHabits,
      setShowCompletedTasks,
      setShowSkippedHabits,
      toggleTaskCompleted,
      addNote,
      updateNote,
      deleteNote,
      logout,
    ],
  );

  return (
    <RepositoryContext.Provider value={repositoryValue}>
      <AppDataContext.Provider value={value}>
        {children}
      </AppDataContext.Provider>
    </RepositoryContext.Provider>
  );
}
