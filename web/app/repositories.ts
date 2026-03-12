import { db } from "./config/firebase";
import {
  createHabitProgressRepository,
  createHabitRepository,
  createTaskRepository,
  createUserPreferencesRepository,
} from "@weekly/firebase";

export const taskRepository = createTaskRepository(db);
export const habitRepository = createHabitRepository(db);
export const habitProgressRepository = createHabitProgressRepository(db);
export const userPreferencesRepository = createUserPreferencesRepository(db);
