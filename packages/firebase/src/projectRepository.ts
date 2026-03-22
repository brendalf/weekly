import {
  type Firestore,
  type DocumentData,
  type QueryDocumentSnapshot,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";

import type {
  Project,
  ProjectInvite,
  ActivityNotification,
  ProjectRepository,
} from "@weekly/domain";

type ProjectDoc = {
  name?: unknown;
  ownerId?: unknown;
  createdAt?: { toDate?: () => Date };
  members?: unknown[];
  pendingInviteEmails?: unknown[];
};

type ActivityDoc = {
  type?: unknown;
  actorUid?: unknown;
  actorDisplayName?: unknown;
  itemId?: unknown;
  itemName?: unknown;
  createdAt?: { toDate?: () => Date };
};

function toActivity(
  id: string,
  projectId: string,
  data: ActivityDoc,
): ActivityNotification {
  return {
    id,
    projectId,
    type:
      data.type === "habit_completed" || data.type === "task_completed"
        ? data.type
        : "task_completed",
    actorUid: typeof data.actorUid === "string" ? data.actorUid : "",
    actorDisplayName:
      typeof data.actorDisplayName === "string" ? data.actorDisplayName : "",
    itemId: typeof data.itemId === "string" ? data.itemId : "",
    itemName: typeof data.itemName === "string" ? data.itemName : "",
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

type InviteDoc = {
  projectId?: unknown;
  projectName?: unknown;
  invitedByUserId?: unknown;
  invitedByDisplayName?: unknown;
  status?: unknown;
  createdAt?: { toDate?: () => Date };
};

function toProject(id: string, data: ProjectDoc): Project {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
    members: Array.isArray(data.members)
      ? (data.members.filter((m) => typeof m === "string") as string[])
      : [],
    pendingInviteEmails: Array.isArray(data.pendingInviteEmails)
      ? (data.pendingInviteEmails.filter(
          (e) => typeof e === "string",
        ) as string[])
      : [],
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

function toInvite(id: string, data: InviteDoc): ProjectInvite {
  return {
    id,
    projectId: typeof data.projectId === "string" ? data.projectId : "",
    projectName: typeof data.projectName === "string" ? data.projectName : "",
    invitedByUserId:
      typeof data.invitedByUserId === "string" ? data.invitedByUserId : "",
    invitedByDisplayName:
      typeof data.invitedByDisplayName === "string"
        ? data.invitedByDisplayName
        : "",
    status:
      data.status === "accepted" || data.status === "declined"
        ? data.status
        : "pending",
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

export function createProjectRepository(db: Firestore): ProjectRepository {
  async function createProjectDoc(
    userId: string,
    name: string,
  ): Promise<string> {
    const projectRef = doc(collection(db, "projects"));
    await setDoc(projectRef, {
      name,
      ownerId: userId,
      members: [userId],
      createdAt: serverTimestamp(),
    });
    return projectRef.id;
  }

  return {
    async createPersonalProject(userId: string) {
      return createProjectDoc(userId, "Personal");
    },

    subscribeUserProjects(
      userId: string,
      onProjects: (projects: Project[]) => void,
    ) {
      const q = query(
        collection(db, "projects"),
        where("members", "array-contains", userId),
      );
      return onSnapshot(q, (snap) => {
        const projects = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) =>
            toProject(d.id, d.data() as ProjectDoc),
        );
        onProjects(projects);
      });
    },

    async createProject(userId: string, name: string) {
      return createProjectDoc(userId, name);
    },

    async deleteProject(projectId: string) {
      await deleteDoc(doc(db, "projects", projectId));
    },

    async renameProject(projectId: string, name: string) {
      await updateDoc(doc(db, "projects", projectId), { name });
    },

    async inviteMember(
      projectId: string,
      invitedByUserId: string,
      invitedByDisplayName: string,
      inviteeEmail: string,
    ) {
      const projectSnap = await getDoc(doc(db, "projects", projectId));
      const projectData = projectSnap.data() as ProjectDoc | undefined;
      const projectName =
        typeof projectData?.name === "string" ? projectData.name : "";

      const inviteRef = doc(
        collection(db, "invitesByEmail", inviteeEmail, "invites"),
      );
      const batch = writeBatch(db);
      batch.set(inviteRef, {
        projectId,
        projectName,
        invitedByUserId,
        invitedByDisplayName,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, "projects", projectId), {
        pendingInviteEmails: arrayUnion(inviteeEmail),
      });
      await batch.commit();
    },

    async removeMember(projectId: string, userIdToRemove: string) {
      await updateDoc(doc(db, "projects", projectId), {
        members: arrayRemove(userIdToRemove),
      });
    },

    async respondToInvite(
      userId: string,
      userEmail: string,
      _displayName: string,
      inviteId: string,
      accept: boolean,
    ) {
      const inviteRef = doc(
        db,
        "invitesByEmail",
        userEmail,
        "invites",
        inviteId,
      );

      const inviteSnap = await getDoc(inviteRef);
      const inviteData = inviteSnap.data() as InviteDoc | undefined;
      if (!inviteData) return;

      const projectId = String(inviteData.projectId);
      const batch = writeBatch(db);

      if (accept) {
        batch.update(inviteRef, { status: "accepted" });
        batch.update(doc(db, "projects", projectId), {
          members: arrayUnion(userId),
          pendingInviteEmails: arrayRemove(userEmail),
        });
      } else {
        batch.update(inviteRef, { status: "declined" });
        batch.update(doc(db, "projects", projectId), {
          pendingInviteEmails: arrayRemove(userEmail),
        });
      }

      await batch.commit();
    },

    subscribeInvites(
      userEmail: string,
      onInvites: (invites: ProjectInvite[]) => void,
    ) {
      const q = query(
        collection(db, "invitesByEmail", userEmail, "invites"),
        where("status", "==", "pending"),
      );
      return onSnapshot(q, (snap) => {
        const invites = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) =>
            toInvite(d.id, d.data() as InviteDoc),
        );
        onInvites(invites);
      });
    },

    subscribeProjectActivities(
      projectId: string,
      currentUserId: string,
      onActivities: (activities: ActivityNotification[]) => void,
    ) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, "projects", projectId, "activities"),
        where("createdAt", ">", Timestamp.fromDate(since)),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      return onSnapshot(q, (snap) => {
        const activities = snap.docs
          .map((d: QueryDocumentSnapshot<DocumentData>) =>
            toActivity(d.id, projectId, d.data() as ActivityDoc),
          )
          .filter((a) => a.actorUid !== currentUserId);
        onActivities(activities);
      });
    },

    async logActivity(
      projectId: string,
      activity: Omit<ActivityNotification, "id" | "createdAt" | "projectId">,
    ) {
      await addDoc(collection(db, "projects", projectId, "activities"), {
        ...activity,
        createdAt: serverTimestamp(),
      });
    },
  };
}
