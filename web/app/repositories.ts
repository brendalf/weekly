import { db } from "./config/firebase";
import {
  createWorkspaceRepository,
  createUserPreferencesRepository,
} from "@weekly/firebase";

export const userPreferencesRepository = createUserPreferencesRepository(db);
export const workspaceRepository = createWorkspaceRepository(db);
export { db };
