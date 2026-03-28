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
  arrayRemove,
  arrayUnion,
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
  type HabitTimeOfDay,
  type Task,
  type TaskRepository,
  Period,
  type UserPreferencesRepository,
  type ThemePreference,
  type LayoutPreference,
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
  scope?: unknown;
};

type HabitDoc = {
  name?: unknown;
  times?: unknown;
  period?: unknown;
  createdAt?: Timestamp;
  activeDays?: unknown;
  skippedPeriods?: unknown;
  timeOfDay?: unknown;
};

type HabitCompletionDoc = {
  occurredAt?: { toDate?: () => Date };
  dayKey?: unknown;
  weekKey?: unknown;
  monthKey?: unknown;
  periodKey?: unknown;
};

type HabitProgressDoc = {
  habitId: string;
  period: Period;
  periodKey: string;
  count: number;
  succeeded: boolean;
  dayCounts?: Record<string, number>;
  updatedAt?: Timestamp | FieldValue;
};

function mapHabitDoc(id: string, data: HabitDoc): Habit {
  return {
    id,
    name: typeof data?.name === "string" ? data.name : "",
    times: typeof data?.times === "number" ? data.times : 0,
    period:
      data?.period === Period.DAY
        ? Period.DAY
        : data?.period === Period.MONTH
          ? Period.MONTH
          : Period.WEEK,
    createdAt:
      data?.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    activeDays: Array.isArray(data?.activeDays)
      ? (data.activeDays as number[]).filter((n) => typeof n === "number")
      : undefined,
    skippedPeriods: Array.isArray(data?.skippedPeriods)
      ? (data.skippedPeriods as string[]).filter((s) => typeof s === "string")
      : undefined,
    timeOfDay: (["morning", "afternoon", "evening"] as HabitTimeOfDay[]).includes(
      data?.timeOfDay as HabitTimeOfDay,
    )
      ? (data?.timeOfDay as HabitTimeOfDay)
      : undefined,
  };
}

function mapTaskDoc(id: string, data: TaskDoc): Task {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    completed: typeof data.completed === "boolean" ? data.completed : false,
    scope:
      data.scope === Period.DAY || data.scope === Period.MONTH
        ? (data.scope as Period)
        : Period.WEEK,
  };
}

function tasksCol(db: Firestore, projectId: string) {
  return collection(db, "workspaces", projectId, "tasks");
}

function habitsCol(db: Firestore, projectId: string) {
  return collection(db, "workspaces", projectId, "habits");
}

function habitDocRef(db: Firestore, projectId: string, habitId: string) {
  return doc(db, "workspaces", projectId, "habits", habitId);
}

function habitProgressCol(db: Firestore, projectId: string) {
  return collection(db, "workspaces", projectId, "habitProgress");
}

function periodDocRef(
  db: Firestore,
  projectId: string,
  habitId: string,
  periodKey: string,
) {
  return doc(
    db,
    "workspaces",
    projectId,
    "habitProgress",
    `${habitId}_${periodKey}`,
  );
}

function completionsCol(db: Firestore, projectId: string, habitId: string) {
  return collection(
    db,
    "workspaces",
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
        const tasks = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) =>
          mapTaskDoc(d.id, d.data() as TaskDoc),
        );
        onTasks(tasks);
      });
    },
    async addTask(title: string, scope?: Period, createdAt?: Date) {
      const ref = await addDoc(tasksCol(db, projectId), {
        title,
        completed: false,
        createdAt: createdAt ?? new Date(),
        scope: scope ?? Period.WEEK,
      });
      return ref.id;
    },
    async toggleTask(task: Task) {
      const ref = doc(db, "workspaces", projectId, "tasks", task.id);
      await updateDoc(ref, { completed: !task.completed });
    },
    async deleteTask(taskId: string) {
      const ref = doc(db, "workspaces", projectId, "tasks", taskId);
      const batch = writeBatch(db);
      batch.delete(ref);
      await batch.commit();
    },
    async updateTaskTitle(taskId: string, title: string) {
      await updateDoc(doc(db, "workspaces", projectId, "tasks", taskId), {
        title,
      });
    },
    async updateTask(taskId: string, updates: { title?: string; scope?: Period }) {
      await updateDoc(doc(db, "workspaces", projectId, "tasks", taskId), updates);
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
        const habits = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) =>
          mapHabitDoc(d.id, d.data() as HabitDoc),
        );
        onHabits(habits);
      });
    },
    async addHabit(name: string, times: number, period: Period, createdAt?: Date, activeDays?: number[], timeOfDay?: HabitTimeOfDay) {
      const date = createdAt ?? new Date();
      const habitRef = doc(habitsCol(db, projectId));
      const batch = writeBatch(db);
      const habitData: Record<string, unknown> = { name, times, period, createdAt: date };
      if (activeDays && activeDays.length > 0) habitData.activeDays = activeDays;
      if (timeOfDay) habitData.timeOfDay = timeOfDay;
      batch.set(habitRef, habitData);
      const pk = periodKeyOf(date, period);
      batch.set(
        doc(db, "workspaces", projectId, "habitProgress", `${habitRef.id}_${pk}`),
        {
          habitId: habitRef.id,
          period,
          periodKey: pk,
          count: 0,
          succeeded: false,
        },
      );
      await batch.commit();
      return habitRef.id;
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
        "workspaces",
        projectId,
        "habits",
        habitId,
        "completions",
        log.id,
      );
      const progressRef = doc(
        db,
        "workspaces",
        projectId,
        "habitProgress",
        `${habitId}_${log.periodKey}`,
      );
      await runTransaction(db, async (tx: Transaction) => {
        const progressSnap = await tx.get(progressRef);
        const data = progressSnap.data() as HabitProgressDoc | undefined;
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
      period: Period,
      activeDays?: number[],
      timeOfDay?: HabitTimeOfDay,
    ) {
      const updates: Record<string, unknown> = { name, times, period };
      if (activeDays !== undefined) {
        updates.activeDays = activeDays.length > 0 ? activeDays : null;
      }
      updates.timeOfDay = timeOfDay ?? null;
      await updateDoc(habitDocRef(db, projectId, habitId), updates);
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
    async skipHabit(habitId: string, periodKeys: string[]) {
      await updateDoc(habitDocRef(db, projectId, habitId), {
        skippedPeriods: arrayUnion(...periodKeys),
      });
    },
    async unskipHabit(habitId: string, periodKey: string) {
      await updateDoc(habitDocRef(db, projectId, habitId), {
        skippedPeriods: arrayRemove(periodKey),
      });
    },
  };
}

export function createUserPreferencesRepository(
  db: Firestore,
): UserPreferencesRepository {
  return {
    subscribeUserPreferences(
      userId: string,
      onPreferences: (prefs: { theme: ThemePreference; layout: LayoutPreference; lastNotificationReadAt: string | null }) => void,
    ) {
      const ref = doc(db, "preferences", userId);
      return onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = snap.data();
        const theme: ThemePreference =
          data?.theme === "light" ? "light" : "dark";
        const VALID_LAYOUTS: LayoutPreference[] = ["period-tabs", "period-sequential"];
        const layout: LayoutPreference = VALID_LAYOUTS.includes(data?.layout)
          ? (data?.layout as LayoutPreference)
          : "period-tabs";
        const lastNotificationReadAt =
          typeof data?.lastNotificationReadAt === "string"
            ? data.lastNotificationReadAt
            : null;
        onPreferences({ theme, layout, lastNotificationReadAt });
      });
    },
    async updateTheme(userId: string, theme: ThemePreference) {
      await setDoc(doc(db, "preferences", userId), { theme }, { merge: true });
    },
    async updateLayout(userId: string, layout: LayoutPreference) {
      await setDoc(doc(db, "preferences", userId), { layout }, { merge: true });
    },
    async updateLastNotificationReadAt(userId: string, ts: string) {
      await setDoc(doc(db, "preferences", userId), { lastNotificationReadAt: ts }, { merge: true });
    },
  };
}

function buildSummaryMap(
  docs: QueryDocumentSnapshot<DocumentData>[],
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const d of docs) {
    const data = d.data() as HabitProgressDoc;
    map.set(data.periodKey, data.succeeded);
  }
  return map;
}

async function fillSummaryGaps(
  db: Firestore,
  projectId: string,
  habitId: string,
  period: Period,
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

  const lastKey = (latestSnap.docs[0].data() as HabitProgressDoc).periodKey;
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
    existingSnap.docs.map((d) => (d.data() as HabitProgressDoc).periodKey),
  );

  const batch = writeBatch(db);
  let wrote = false;
  for (const gapKey of gapKeys) {
    if (!existingKeys.has(gapKey)) {
      batch.set(
        doc(db, "workspaces", projectId, "habitProgress", `${habitId}_${gapKey}`),
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
      period: Period,
      referenceDate: Date,
      onProgress: (data: {
        count: number;
        dayCounts: Record<string, number>;
      }) => void,
    ) {
      const periodKey = periodKeyOf(referenceDate, period);
      const ref = periodDocRef(db, projectId, habitId, periodKey);
      return onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = snap.data() as HabitProgressDoc | undefined;
        onProgress({
          count: data?.count ?? 0,
          dayCounts: data?.dayCounts ?? {},
        });
      });
    },
    subscribeHabitStreak(
      habitId: string,
      period: Period,
      createdAt: Date,
      referenceDate: Date,
      onStreak: (streak: {
        currentStrikeLength: number;
        openSincePeriodKey: string | null;
      }) => void,
      skippedPeriods?: string[],
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
            skippedPeriods,
          ),
        );
      });
    },
    async incrementHabit(
      habitId: string,
      period: Period,
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
        const existing = snap.data() as HabitProgressDoc | undefined;
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
          occurredAt: referenceDate,
          dayKey,
          weekKey,
          monthKey,
          periodKey,
        });
      });
    },
  };
}
