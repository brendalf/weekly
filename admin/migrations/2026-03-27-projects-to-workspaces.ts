/**
 * Migration script: copies all data from `projects` collection to `workspaces`.
 *
 * Run once before deploying the renamed code:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   npx tsx scripts/migrate-projects-to-workspaces.ts
 *
 * Prerequisites:
 *   - Download a service account JSON from Firebase Console →
 *     Project settings → Service accounts → Generate new private key
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to its path
 */

import * as admin from "firebase-admin";

const SUB_COLLECTIONS = ["habits", "tasks", "habitProgress", "activities"];

async function copyDocs(
  src: admin.firestore.CollectionReference,
  dst: admin.firestore.CollectionReference,
  db: admin.firestore.Firestore,
): Promise<number> {
  const snap = await src.get();
  if (snap.empty) return 0;

  let batch = db.batch();
  let batchCount = 0;
  let total = 0;

  for (const doc of snap.docs) {
    batch.set(dst.doc(doc.id), doc.data());
    batchCount++;
    total++;

    if (batchCount === 499) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  return total;
}

async function copyHabitsWithCompletions(
  srcProjectRef: admin.firestore.DocumentReference,
  dstWorkspaceRef: admin.firestore.DocumentReference,
  db: admin.firestore.Firestore,
): Promise<void> {
  const habitsSnap = await srcProjectRef.collection("habits").get();
  if (habitsSnap.empty) return;

  let batch = db.batch();
  let batchCount = 0;
  let habitCount = 0;

  for (const habitDoc of habitsSnap.docs) {
    batch.set(dstWorkspaceRef.collection("habits").doc(habitDoc.id), habitDoc.data());
    batchCount++;
    habitCount++;

    if (batchCount === 499) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }

  console.log(`  Copied ${habitCount} docs from habits`);

  // Copy completions sub-collection for each habit
  let totalCompletions = 0;
  for (const habitDoc of habitsSnap.docs) {
    const count = await copyDocs(
      srcProjectRef.collection("habits").doc(habitDoc.id).collection("completions"),
      dstWorkspaceRef.collection("habits").doc(habitDoc.id).collection("completions"),
      db,
    );
    totalCompletions += count;
  }

  if (totalCompletions > 0) {
    console.log(`  Copied ${totalCompletions} docs from habits/*/completions`);
  }
}

async function migrate(): Promise<void> {
  admin.initializeApp();
  const db = admin.firestore();

  const projectsSnap = await db.collection("projects").get();

  if (projectsSnap.empty) {
    console.log("No projects found — nothing to migrate.");
    process.exit(0);
  }

  console.log(`Found ${projectsSnap.size} project(s) to migrate.\n`);

  for (const projectDoc of projectsSnap.docs) {
    const projectId = projectDoc.id;
    const data = projectDoc.data();
    console.log(`Migrating: ${projectId} (${data.name ?? "unnamed"})`);

    // Write workspace doc with same ID and data
    await db.collection("workspaces").doc(projectId).set(data);
    console.log(`  Copied workspace doc`);

    // Copy habits + their completions sub-collections
    await copyHabitsWithCompletions(
      db.collection("projects").doc(projectId),
      db.collection("workspaces").doc(projectId),
      db,
    );

    // Copy remaining flat sub-collections
    for (const subCol of ["tasks", "habitProgress", "activities"]) {
      const count = await copyDocs(
        db.collection("projects").doc(projectId).collection(subCol),
        db.collection("workspaces").doc(projectId).collection(subCol),
        db,
      );
      if (count > 0) console.log(`  Copied ${count} docs from ${subCol}`);
    }

    // Delete original project doc
    await db.collection("projects").doc(projectId).delete();
    console.log(`  Deleted original project doc`);
  }

  console.log("\nMigration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
