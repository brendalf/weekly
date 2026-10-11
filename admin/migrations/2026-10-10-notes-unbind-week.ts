/**
 * Migration script: copies week-scoped notes
 * (`workspaces/{ws}/weekNotes/{weekKey}/items/{noteId}`) to the flat,
 * workspace-scoped collection (`workspaces/{ws}/notes/{noteId}`).
 *
 * Document ids and every field (title, body, authorId, authorDisplayName,
 * createdAt, updatedAt) are preserved. The source docs are NOT deleted, so the
 * legacy `weekNotes` data stays readable until it is cleaned up separately.
 *
 * Run once before deploying the unbound-notes code:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   npx tsx admin/migrations/2026-10-10-notes-unbind-week.ts [--dry-run]
 *
 * Prerequisites:
 *   - Download a service account JSON from Firebase Console →
 *     Project settings → Service accounts → Generate new private key
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to its path
 */

import * as admin from "firebase-admin";
import { readFileSync } from "node:fs";

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * The target project comes from the credential, not a flag. `initializeApp()`
 * resolves it lazily and leaves `options.projectId` unset, so read it straight
 * from the service-account file the SDK will use.
 */
function resolveProjectId(): string {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    try {
      const parsed = JSON.parse(readFileSync(keyPath, "utf8")) as {
        project_id?: string;
      };
      if (parsed.project_id) return parsed.project_id;
    } catch {
      /* fall through to the env vars below */
    }
  }
  return (
    process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "unknown"
  );
}

async function copyWorkspaceNotes(
  workspaceRef: admin.firestore.DocumentReference,
  db: admin.firestore.Firestore,
): Promise<number> {
  // The old repository wrote notes with addDoc straight into
  // weekNotes/{weekKey}/items, which never created the weekNotes/{weekKey}
  // parent document. Those ancestors exist only implicitly, so a .get() on the
  // collection returns nothing — listDocuments() is the only way to reach them.
  const weekRefs = await workspaceRef.collection("weekNotes").listDocuments();
  if (weekRefs.length === 0) return 0;

  const notesCol = workspaceRef.collection("notes");

  let batch = db.batch();
  let batchCount = 0;
  let total = 0;

  for (const weekRef of weekRefs) {
    const itemsSnap = await weekRef.collection("items").get();
    if (itemsSnap.empty) continue;

    for (const noteDoc of itemsSnap.docs) {
      total++;
      if (DRY_RUN) continue;

      batch.set(notesCol.doc(noteDoc.id), noteDoc.data());
      batchCount++;

      if (batchCount === 499) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) await batch.commit();
  return total;
}

async function migrate(): Promise<void> {
  admin.initializeApp();
  const db = admin.firestore();

  // Print the target before writing anything — this script is run once per
  // environment and a wrong key must be obvious.
  console.log(`Project: ${resolveProjectId()}\n`);

  const workspacesSnap = await db.collection("workspaces").get();

  if (workspacesSnap.empty) {
    console.log("No workspaces found — nothing to migrate.");
    process.exit(0);
  }

  if (DRY_RUN) console.log("Dry run — no writes will be performed.\n");
  console.log(`Found ${workspacesSnap.size} workspace(s) to scan.\n`);

  let grandTotal = 0;

  for (const workspaceDoc of workspacesSnap.docs) {
    const data = workspaceDoc.data();
    console.log(`Scanning: ${workspaceDoc.id} (${data.name ?? "unnamed"})`);

    const count = await copyWorkspaceNotes(workspaceDoc.ref, db);
    grandTotal += count;

    if (count === 0) {
      console.log("  No week notes found");
    } else {
      console.log(
        `  ${DRY_RUN ? "Would copy" : "Copied"} ${count} note(s) to notes/`,
      );
    }
  }

  console.log(
    `\nMigration ${DRY_RUN ? "dry run " : ""}complete — ${grandTotal} note(s) in total.`,
  );
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
