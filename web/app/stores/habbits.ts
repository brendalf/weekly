import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { Habit, HabitPeriod } from "@weekly/domain";

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
      const data = d.data() as any;

      const times: number =
        typeof data?.times === "number"
          ? data.times
          : typeof data?.weeklyTarget === "number"
            ? data.weeklyTarget
            : 0;

      const period: Habit["period"] =
  data?.period === "day" ? HabitPeriod.Day
  : data?.period === "week" ? HabitPeriod.Week
  : data?.period === "month" ? HabitPeriod.Month
  : typeof data?.weeklyTarget === "number" ? HabitPeriod.Week
  : HabitPeriod.Week;

      return {
  id: d.id,
  name: data?.name ?? "",
  times,
  period,
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