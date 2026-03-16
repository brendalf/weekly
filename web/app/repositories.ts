import { db } from "./config/firebase";
import {
  createProjectRepository,
  createUserPreferencesRepository,
} from "@weekly/firebase";

export const userPreferencesRepository = createUserPreferencesRepository(db);
export const projectRepository = createProjectRepository(db);
export { db };
