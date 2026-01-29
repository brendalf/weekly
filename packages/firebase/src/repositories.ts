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
  runTransaction,
  serverTimestamp,
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
  HabitPeriod,
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
  period: HabitPeriod;
  periodKey: string;
  count: number;
  dayCounts?: Record<string, number>;
  updatedAt?: Timestamp | FieldValue;
};

function tasksCollection(db: Firestore, userId: string) {
  return collection(db, "users", userId, "tasks");
}

function habbitsCollection(db: Firestore, userId: string) {
  return collection(db, "users", userId, "habbits");
}

function habitDocRef(db: Firestore, userId: string, habitId: string) {
  return doc(db, "users", userId, "habbits", habitId);
}

function progressDocRef(db: Firestore, userId: string, habitId: string, periodKey: string) {
  return doc(db, "users", userId, "habitProgress", `${habitId}_${periodKey}`);
}

export function createTaskRepository(db: Firestore): TaskRepository {
  return {
    subscribeTasks(userId: string, onTasks: (tasks: Task[]) => void) {
      const q = query(tasksCollection(db, userId), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const tasks = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const data = d.data() as TaskDoc;
          return {
            id: d.id,
            title: typeof data.title === "string" ? data.title : "",
            createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
            completed: typeof data.completed === "boolean" ? data.completed : false,
          };
        });
        onTasks(tasks);
      });
    },
    async addTask(userId: string, title: string) {
      await addDoc(tasksCollection(db, userId), {
        title,
        completed: false,
        createdAt: new Date(),
      });
    },
    async toggleTask(userId: string, task: Task) {
      const ref = doc(db, "users", userId, "tasks", task.id);
      await updateDoc(ref, { completed: !task.completed });
    },
  };
}

export function createHabitRepository(db: Firestore): HabitRepository {
  return {
    subscribeHabits(userId: string, onHabits: (habits: Habit[]) => void) {
      const q = query(habbitsCollection(db, userId), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const habbits = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
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
          };
        });
        onHabits(habbits);
      });
    },
    async addHabit(userId: string, name: string, times: number, period: HabitPeriod) {
      await addDoc(habbitsCollection(db, userId), {
        name,
        times,
        period,
        createdAt: new Date(),
      });
    },
    subscribeHabitCompletions(
      userId: string,
      habitId: string,
      onLogs: (logs: HabitCompletionLog[]) => void,
    ) {
      const logsCol = collection(db, "users", userId, "habbits", habitId, "completions");
      const q = query(logsCol, orderBy("occurredAt", "desc"), limit(30));
      return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
        const logs: HabitCompletionLog[] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const data = d.data() as HabitCompletionDoc;
          return {
            id: d.id,
            occurredAt: data.occurredAt?.toDate?.().toISOString(),
            dayKey: typeof data.dayKey === "string" ? data.dayKey : undefined,
            weekKey: typeof data.weekKey === "string" ? data.weekKey : undefined,
            monthKey: typeof data.monthKey === "string" ? data.monthKey : undefined,
            periodKey: typeof data.periodKey === "string" ? data.periodKey : undefined,
          };
        });
        onLogs(logs);
      });
    },
    async deleteHabit(userId: string, habitId: string) {
      const batch = writeBatch(db);

      const logsCol = collection(db, "users", userId, "habbits", habitId, "completions");
      const logsSnap = await getDocs(logsCol);
      logsSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => batch.delete(d.ref));

      batch.delete(habitDocRef(db, userId, habitId));
      await batch.commit();
    },
  };
}

export function createHabitProgressRepository(db: Firestore): HabitProgressRepository {
  return {
    subscribeHabitProgress(
      userId: string,
      habitId: string,
      period: HabitPeriod,
      referenceDate: Date,
      onProgress: (data: { count: number; dayCounts: Record<string, number> }) => void,
    ) {
      const periodKey = periodKeyOf(referenceDate, period);
      const ref = progressDocRef(db, userId, habitId, periodKey);
      return onSnapshot(ref, (snap: DocumentSnapshot<DocumentData>) => {
        const data = snap.data() as HabitProgressDoc | undefined;
        onProgress({ count: data?.count ?? 0, dayCounts: data?.dayCounts ?? {} });
      });
    },
    async incrementHabit(
      userId: string,
      habitId: string,
      period: HabitPeriod,
      target: number,
      referenceDate: Date,
    ) {
      const dayKey = dayKeyOf(referenceDate);
      const weekKey = weekKeyOf(referenceDate);
      const monthKey = monthKeyOf(referenceDate);
      const periodKey = periodKeyOf(referenceDate, period);

      const ref = progressDocRef(db, userId, habitId, periodKey);
      await runTransaction(db, async (tx: Transaction) => {
        const snap = await tx.get(ref);
        const existing = snap.data() as HabitProgressDoc | undefined;
        const prevCount = existing?.count ?? 0;
        const nextCount = Math.min(prevCount + 1, Math.max(1, target));
        const prevDayCounts = existing?.dayCounts ?? {};
        const nextForDay = Math.min((prevDayCounts[dayKey] ?? 0) + 1, Math.max(1, target));

        const toWrite: HabitProgressDoc = {
          habitId,
          period,
          periodKey,
          count: nextCount,
          dayCounts: { ...prevDayCounts, [dayKey]: nextForDay },
          updatedAt: serverTimestamp(),
        };

        if (snap.exists()) {
          tx.set(ref, toWrite, { merge: true });
        } else {
          tx.set(ref, toWrite);
        }

        const logsCol = collection(db, "users", userId, "habbits", habitId, "completions");
        const logRef = doc(logsCol);
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
