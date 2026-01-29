import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
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