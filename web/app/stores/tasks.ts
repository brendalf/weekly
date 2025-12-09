import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Task } from "@weekly/domain";

function tasksCollection(userId: string) {
  return collection(db, "users", userId, "tasks");
}

export function subscribeToTasks(
  userId: string,
  onTasks: (tasks: Task[]) => void,
) {
  const q = query(tasksCollection(userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        title: data.title ?? "",
        createdAt: data.createdAt?.toDate?.().toISOString?.() ??
          new Date().toISOString(),
        completed: Boolean(data.completed),
      };
    });
    onTasks(tasks);
  });
}

export async function addTaskRemote(userId: string, title: string) {
  await addDoc(tasksCollection(userId), {
    title,
    completed: false,
    createdAt: new Date(),
  });
}

export async function toggleTaskRemote(userId: string, task: Task) {
  const ref = doc(db, "users", userId, "tasks", task.id);
  await updateDoc(ref, { completed: !task.completed });
}
