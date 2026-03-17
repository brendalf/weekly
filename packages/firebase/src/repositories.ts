import {
  type Firestore,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Transaction,
  Timestamp,
  FieldValue,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import {
  type Habit,
  type HabitCompletionLog,
  type HabitProgressRepository,
  type HabitRepository,
  type Task,
  type TaskRepository,
  type UserPreferencesRepository,
  type ThemePreference,
  type LayoutPreference,
  HabitPeriod,
  computeStreak,
  prevPeriodDate,
  dayKeyOf,
  monthKeyOf,
  periodKeyOf,
  weekKeyOf,
} from "@weekly/domain";

type TaskDoc = {
  title?: unknown;
  createdAt?: Timestamp;
  completed?: unknown;
};

type HabitDoc = {
  name?: unknown;
  times?: unknown;
  period?: unknown;
  createdAt?: Timestamp;
};

type HabitCompletionDoc = {
  occurredAt?: { toDate?: () => Date };
  dayKey?: unknown;
  weekKey?: unknown;
  monthKey?: unknown;
  periodKey?: unknown;
};

type HabitPeriodDoc = {
  habitId: string;
  period: HabitPeriod;
  periodKey: string;
  count: number;
  succeeded: boolean;
  dayCounts?: Record<string, number>;
  updatedAt?: Timestamp | FieldValue;
};

function tasksCol(db: Firestore, projectId: string) {
  return collection(db, "projects", projectId, "tasks");
}

function habitsCol(db: Firestore, projectId: string) {
  return collection(db, "projects", projectId, "habits");
}

function habitDocRef(db: Firestore, projectId: string, habitId: string) {
  return doc(db, "projects", projectId, "habits", habitId);
}

function habitProgressCol(db: Firestore, projectId: string) {
  return collection(db, "projects", projectId, "habitProgress");
}

function periodDocRef(
  db: Firestore,
  projectId: string,
  habitId: string,
  periodKey: string,
) {
  return doc(
    db,
    "projects",
    projectId,
    "habitProgress",
    `${habitId}_${periodKey}`,
  );
}

function completionsCol(db: Firestore, projectId: string, habitId: string) {
  return collection(
    db,
    "projects",
    projectId,
    "habits",
    habitId,
    "completions",
  );
}

export function createTaskRepository(
  db: Firestore,
  projectId: string,
): TaskRepository {
  return {
    subscribeTasks(onTasks: (tasks: Task[]) => void) {
      const q = query(tasksCol(db, projectId), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const tasks = snapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data() as TaskDoc;
            return {
              id: d.id,
              title: typeof data.title === "string" ? data.title : "",
              createdAt:
                data.createdAt?.toDate().toISOString() ??
                new Date().toISOString(),
              completed:
                typeof data.completed === "boolean" ? data.completed : false,
            };
          },
        );
        onTasks(tasks);
      });
    },
    async addTask(title: string) {
      await addDoc(tasksCol(db, projectId), {
        title,
        completed: false,
        createdAt: new Date(),
      });
    },
    async toggleTask(task: Task) {
      const ref = doc(db, "projects", projectId, "tasks", task.id);
      await updateDoc(ref, { completed: !task.completed });
    },
    async deleteTask(taskId: string) {
      const ref = doc(db, "projects", projectId, "tasks", taskId);
      const batch = writeBatch(db);
      batch.delete(ref);
      await batch.commit();
    },
    async updateTaskTitle(taskId: string, title: string) {
      await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
        title,
      });
    },
  };
}

export function createHabitRepository(
  db: Firestore,
  projectId: string,
): HabitRepository {
  return {
    subscribeHabits(onHabits: (habits: Habit[]) => void) {
      const q = query(habitsCol(db, projectId), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const habits = snapshot.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data() as HabitDoc;
            return {
              id: d.id,
              name: typeof data?.name === "string" ? data.name : "",
              times: typeof data?.times === "number" ? data.times : 0,
              period:
                data?.period === HabitPeriod.Day
                  ? HabitPeriod.Day
                  : data?.period === HabitPeriod.Month
                    ? HabitPeriod.Month
                    : HabitPeriod.Week,
              createdAt:
                data?.createdAt?.toDate().toISOString() ??
                new Date().toISOString(),
            };
          },
        );
        onHabits(habits);
      });
    },
    async addHabit(name: string, times: number, period: HabitPeriod) {
      const habitRef = doc(habitsCol(db, projectId));
      const batch = writeBatch(db);
      batch.set(habitRef, { name, times, period, createdAt: new Date() });
      const pk = periodKeyOf(new Date(), period);
      batch.set(
        doc(db, "projects", projectId, "habitProgress", `${habitRef.id}_${pk}`),
        {
          habitId: habitRef.id,
          period,
          periodKey: pk,
          count: 0,
          succeeded: false,
        },
      );
      await batch.commit();
    },
    subscribeHabitCompletions(
      habitId: string,
      onLogs: (logs: HabitCompletionLog[]) => void,
    ) {
      const q = query(
        completionsCol(db, projectId, habitId),
        orderBy("occurredAt", "desc"),
        limit(30),
      );
      return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
        const logs: HabitCompletionLog[] = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data() as HabitCompletionDoc;
            return {
              id: d.id,
              occurredAt: data.occurredAt?.toDate?.().toISOString(),
              dayKey: typeof data.dayKey === "string" ? data.dayKey : undefined,
              weekKey:
                typeof data.weekKey === "string" ? data.weekKey : undefined,
              monthKey:
                typeof data.monthKey === "string" ? data.monthKey : undefined,
              periodKey:
                typeof data.periodKey === "string" ? data.periodKey : undefined,
            };
          },
        );
        onLogs(logs);
      });
    },
    async deleteHabitLog(
      habitId: string,
      log: { id: string; periodKey?: string; dayKey?: string },
      target: number,
    ) {
      if (!log.periodKey) return;
      const logRef = doc(
        db,
        "projects",
        projectId,
        "habits",
        habitId,
        "completions",
        log.id,
      );
      const progressRef = doc(
        db,
        "projects",
        projectId,
        "habitProgress",
        `${habitId}_${log.periodKey}`,
      );
      await runTransaction(db, async (tx: Transaction) => {
        const progressSnap = await tx.get(progressRef);
        const data = progressSnap.data() as HabitPeriodDoc | undefined;
        const newCount = Math.max(0, (data?.count ?? 0) - 1);
        const prevDayCounts = data?.dayCounts ?? {};
        const updates: Record<string, unknown> = {
          count: newCount,
          succeeded: newCount >= target,
        };
        if (log.dayKey) {
          updates[`dayCounts.${log.dayKey}`] = Math.max(
            0,
            (prevDayCounts[log.dayKey] ?? 0) - 1,
          );
        }
        tx.delete(logRef);
        tx.update(progressRef, updates);
      });
    },
    async updateHabit(
      habitId: string,
      name: string,
      times: number,
      period: HabitPeriod,
    ) {
      await updateDoc(habitDocRef(db, projectId, habitId), {
        name,
        times,
        period,
      });
    },
    async deleteHabit(habitId: string) {
      const batch = writeBatch(db);
      const logsSnap = await getDocs(completionsCol(db, projectId, habitId));
      logsSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) =>
        batch.delete(d.ref),
      );
      batch.delete(habitDocRef(db, projectId, habitId));
      await batch.commit();
    },
  };
}

export function createUserPreferencesRepository(
  db: Firestore,
): UserPreferencesRepository {
  return {
    subscribeUserPreferences(
      userId: string,
      onPreferences: (prefs: { theme: ThemePreference; layout: LayoutPreference }) => void,
    ) {
      const ref = doc(db, "preferences", userId);
      return onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = snap.data();
        const theme: ThemePreference =
          data?.theme === "light" ? "light" : "dark";
        const layout: LayoutPreference =
          data?.layout === "side-by-side" ? "side-by-side" : "tabs";
        onPreferences({ theme, layout });
      });
    },
    async updateTheme(userId: string, theme: ThemePreference) {
      await setDoc(doc(db, "preferences", userId), { theme }, { merge: true });
    },
    async updateLayout(userId: string, layout: LayoutPreference) {
      await setDoc(doc(db, "preferences", userId), { layout }, { merge: true });
    },
  };
}

function buildSummaryMap(
  docs: QueryDocumentSnapshot<DocumentData>[],
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const d of docs) {
    const data = d.data() as HabitPeriodDoc;
    map.set(data.periodKey, data.succeeded);
  }
  return map;
}

async function fillSummaryGaps(
  db: Firestore,
  projectId: string,
  habitId: string,
  period: HabitPeriod,
  referenceDate: Date,
): Promise<void> {
  const currentPeriodKey = periodKeyOf(referenceDate, period);
  const latestQ = query(
    habitProgressCol(db, projectId),
    where("habitId", "==", habitId),
    where("period", "==", period),
    orderBy("periodKey", "desc"),
    limit(1),
  );
  const latestSnap = await getDocs(latestQ);
  if (latestSnap.empty) return;

  const lastKey = (latestSnap.docs[0].data() as HabitPeriodDoc).periodKey;
  if (lastKey >= currentPeriodKey) return;

  const gapKeys: string[] = [];
  let d = prevPeriodDate(referenceDate, period);
  while (periodKeyOf(d, period) > lastKey) {
    gapKeys.push(periodKeyOf(d, period));
    d = prevPeriodDate(d, period);
  }
  if (gapKeys.length === 0) return;

  const existingQ = query(
    habitProgressCol(db, projectId),
    where("habitId", "==", habitId),
    where("period", "==", period),
    where("periodKey", "in", gapKeys),
  );
  const existingSnap = await getDocs(existingQ);
  const existingKeys = new Set(
    existingSnap.docs.map((d) => (d.data() as HabitPeriodDoc).periodKey),
  );

  const batch = writeBatch(db);
  let wrote = false;
  for (const gapKey of gapKeys) {
    if (!existingKeys.has(gapKey)) {
      batch.set(
        doc(db, "projects", projectId, "habitProgress", `${habitId}_${gapKey}`),
        { habitId, period, periodKey: gapKey, count: 0, succeeded: false },
      );
      wrote = true;
    }
  }
  if (wrote) await batch.commit();
}

export function createHabitProgressRepository(
  db: Firestore,
  projectId: string,
): HabitProgressRepository {
  return {
    subscribeHabitProgress(
      habitId: string,
      period: HabitPeriod,
      referenceDate: Date,
      onProgress: (data: {
        count: number;
        dayCounts: Record<string, number>;
      }) => void,
    ) {
      const periodKey = periodKeyOf(referenceDate, period);
      const ref = periodDocRef(db, projectId, habitId, periodKey);
      return onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = snap.data() as HabitPeriodDoc | undefined;
        onProgress({
          count: data?.count ?? 0,
          dayCounts: data?.dayCounts ?? {},
        });
      });
    },
    subscribeHabitStreak(
      habitId: string,
      period: HabitPeriod,
      createdAt: Date,
      referenceDate: Date,
      onStreak: (streak: {
        currentStrikeLength: number;
        openSincePeriodKey: string | null;
      }) => void,
    ) {
      const createdPeriodKey = periodKeyOf(createdAt, period);
      const q = query(
        habitProgressCol(db, projectId),
        where("habitId", "==", habitId),
        where("period", "==", period),
        where("periodKey", ">=", createdPeriodKey),
        orderBy("periodKey", "desc"),
      );
      return onSnapshot(q, (snap) => {
        onStreak(
          computeStreak(
            buildSummaryMap(snap.docs),
            referenceDate,
            createdAt,
            period,
          ),
        );
      });
    },
    async incrementHabit(
      habitId: string,
      period: HabitPeriod,
      target: number,
      referenceDate: Date,
    ) {
      const dayKey = dayKeyOf(referenceDate);
      const weekKey = weekKeyOf(referenceDate);
      const monthKey = monthKeyOf(referenceDate);
      const periodKey = periodKeyOf(referenceDate, period);

      await fillSummaryGaps(db, projectId, habitId, period, referenceDate);

      const ref = periodDocRef(db, projectId, habitId, periodKey);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(ref);
        const existing = snap.data() as HabitPeriodDoc | undefined;
        const prevCount = existing?.count ?? 0;
        const nextCount = Math.min(prevCount + 1, Math.max(1, target));
        const prevDayCounts = existing?.dayCounts ?? {};
        const nextForDay = Math.min(
          (prevDayCounts[dayKey] ?? 0) + 1,
          Math.max(1, target),
        );

        tx.set(
          ref,
          {
            habitId,
            period,
            periodKey,
            count: nextCount,
            succeeded: nextCount >= target,
            dayCounts: { ...prevDayCounts, [dayKey]: nextForDay },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        const logRef = doc(completionsCol(db, projectId, habitId));
        tx.set(logRef, {
          occurredAt: serverTimestamp(),
          dayKey,
          weekKey,
          monthKey,
          periodKey,
        });
      });
    },
  };
}
