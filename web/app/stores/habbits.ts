import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Habit, HabitPeriod } from "@weekly/domain";

type HabitDoc = {
  name?: unknown;
  times?: unknown;
  period?: unknown;
};

function habbitsCollection(userId: string) {
  return collection(db, "users", userId, "habbits");
}

function habitDocRef(userId: string, habitId: string) {
  return doc(db, "users", userId, "habbits", habitId);
}

export interface HabitCompletionLog {
  id: string;
  occurredAt?: string;
  dayKey?: string;
  weekKey?: string;
  monthKey?: string;
  periodKey?: string;
}

export function subscribeToHabbits(
  userId: string,
  onHabbits: (habbits: Habit[]) => void,
) {
  const q = query(habbitsCollection(userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const habbits: Habit[] = snapshot.docs.map((d) => {
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
    onHabbits(habbits);
  });
}

export async function addHabbitRemote(
  userId: string,
  name: string,
  times: number,
  period: HabitPeriod,
) {
  await addDoc(habbitsCollection(userId), {
    name,
    times,
    period,
    createdAt: new Date(),
  });
}

export function subscribeToHabitCompletions(
  userId: string,
  habitId: string,
  onLogs: (logs: HabitCompletionLog[]) => void,
) {
  const logsCol = collection(db, "users", userId, "habbits", habitId, "completions");
  const q = query(logsCol, orderBy("occurredAt", "desc"), limit(30));
  return onSnapshot(q, (snap) => {
    const logs: HabitCompletionLog[] = snap.docs.map((d) => {
      const data = d.data() as {
        occurredAt?: { toDate?: () => Date };
        dayKey?: unknown;
        weekKey?: unknown;
        monthKey?: unknown;
        periodKey?: unknown;
      };
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
}

export async function deleteHabbitRemote(userId: string, habitId: string) {
  const batch = writeBatch(db);

  const logsCol = collection(db, "users", userId, "habbits", habitId, "completions");
  const logsSnap = await getDocs(logsCol);
  logsSnap.docs.forEach((d) => batch.delete(d.ref));

  batch.delete(habitDocRef(userId, habitId));
  await batch.commit();
}