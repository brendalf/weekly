import {
  FieldValue,
  Timestamp,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { dayKeyOf, weekKeyOf, monthKeyOf, periodKeyOf, HabitPeriod } from "@weekly/domain";

export interface HabitProgressDoc {
  habitId: string;
  period: HabitPeriod;
  periodKey: string;
  count: number;
  dayCounts?: Record<string, number>;
  updatedAt?: Timestamp | FieldValue;
}

function progressDocRef(userId: string, habitId: string, periodKey: string) {
  return doc(db, "users", userId, "habitProgress", `${habitId}_${periodKey}`);
}

export function subscribeToHabitProgress(
  userId: string,
  habitId: string,
  period: HabitPeriod,
  referenceDate: Date,
  onProgress: (data: { count: number; dayCounts: Record<string, number> }) => void,
) {
  const periodKey = periodKeyOf(referenceDate, period);
  const ref = progressDocRef(userId, habitId, periodKey);
  return onSnapshot(ref, (snap) => {
    const data = snap.data() as HabitProgressDoc | undefined;
    onProgress({ count: data?.count ?? 0, dayCounts: data?.dayCounts ?? {} });
  });
}

export async function incrementHabit(
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

  const ref = progressDocRef(userId, habitId, periodKey);
  await runTransaction(db, async (tx) => {
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
}