/**
 * Migration script: copies all data from `projects` collection to `workspaces`.
 *
 * Run once before deploying the renamed code:
 *   npx ts-node scripts/migrate-projects-to-workspaces.ts
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT env var
 *   - npm install firebase-admin ts-node typescript (in project root or scripts/)
 */

import * as admin from "firebase-admin";

const SUB_COLLECTIONS = ["habits", "tasks", "habitProgress", "activities"];

async function copySubCollection(
  srcDocRef: admin.firestore.DocumentReference,
  dstDocRef: admin.firestore.DocumentReference,
  subColName: string,
): Promise<void> {
  const srcCol = srcDocRef.collection(subColName);
  const snap = await srcCol.get();
  if (snap.empty) return;

  const batch = admin.firestore().batch();
  let count = 0;

  for (const doc of snap.docs) {
    batch.set(dstDocRef.collection(subColName).doc(doc.id), doc.data());
    count++;
    // Firestore batch limit is 500 operations
    if (count % 499 === 0) {
      await batch.commit();
      console.log(`  Flushed batch of ${count} docs in ${subColName}`);
    }
  }

  await batch.commit();
  console.log(`  Copied ${count} docs from ${subColName}`);
}

async function migrate(): Promise<void> {
  // Initialize with application default credentials
  admin.initializeApp();
  const db = admin.firestore();

  const projectsSnap = await db.collection("projects").get();
  console.log(`Found ${projectsSnap.size} project(s) to migrate.`);

  for (const projectDoc of projectsSnap.docs) {
    const projectId = projectDoc.id;
    const data = projectDoc.data();
    console.log(`\nMigrating project: ${projectId} (${data.name ?? "unnamed"})`);

    // Write workspace doc with same ID and data
    await db.collection("workspaces").doc(projectId).set(data);
    console.log(`  Copied workspace doc`);

    // Copy all sub-collections
    for (const subCol of SUB_COLLECTIONS) {
      await copySubCollection(
        db.collection("projects").doc(projectId),
        db.collection("workspaces").doc(projectId),
        subCol,
      );
    }

    // Delete original project doc (sub-collections must be deleted separately in production)
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
