
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { Habit } from "@weekly/domain";

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
      return {
        id: d.id,
        name: data.name ?? "",
        weeklyTarget: data.weeklyTarget ?? 0,
        createdAt: data.createdAt?.toDate?.().toISOString?.() ??
          new Date().toISOString(),
      };
    });
    onHabbits(habbits);
  });
}


export async function addHabbitRemote(userId: string, name: string, weeklyTarget: number) {
  await addDoc(habbitsCollection(userId), {
    name,
    weeklyTarget,
    createdAt: new Date(),
  });
}