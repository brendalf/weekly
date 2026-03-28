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
  Workspace,
  WorkspaceInvite,
  ActivityNotification,
  WorkspaceRepository,
} from "@weekly/domain";

type WorkspaceDoc = {
  name?: unknown;
  ownerId?: unknown;
  createdAt?: { toDate?: () => Date };
  members?: unknown[];
  pendingInviteEmails?: unknown[];
};

const KNOWN_ACTIVITY_TYPES = new Set([
  "habit_completed",
  "task_completed",
  "habit_added",
  "task_added",
  "note_added",
  "note_edited",
  "note_deleted",
] as const);

type ActivityDoc = {
  type?: unknown;
  actorUid?: unknown;
  actorDisplayName?: unknown;
  itemId?: unknown;
  itemName?: unknown;
  weekKey?: unknown;
  createdAt?: { toDate?: () => Date };
};

function toActivity(
  id: string,
  workspaceId: string,
  data: ActivityDoc,
): ActivityNotification {
  return {
    id,
    workspaceId,
    type: KNOWN_ACTIVITY_TYPES.has(data.type as ActivityNotification["type"])
      ? (data.type as ActivityNotification["type"])
      : "task_completed",
    actorUid: typeof data.actorUid === "string" ? data.actorUid : "",
    actorDisplayName:
      typeof data.actorDisplayName === "string" ? data.actorDisplayName : "",
    itemId: typeof data.itemId === "string" ? data.itemId : "",
    itemName: typeof data.itemName === "string" ? data.itemName : "",
    ...(typeof data.weekKey === "string" ? { weekKey: data.weekKey } : {}),
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

type InviteDoc = {
  workspaceId?: unknown;
  workspaceName?: unknown;
  // legacy field names kept for backwards compat with existing invite docs
  projectId?: unknown;
  projectName?: unknown;
  invitedByUserId?: unknown;
  invitedByDisplayName?: unknown;
  status?: unknown;
  createdAt?: { toDate?: () => Date };
};

function toWorkspace(id: string, data: WorkspaceDoc): Workspace {
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

function toInvite(id: string, data: InviteDoc): WorkspaceInvite {
  // Support both new (workspaceId/workspaceName) and legacy (projectId/projectName) field names
  const workspaceId =
    typeof data.workspaceId === "string"
      ? data.workspaceId
      : typeof data.projectId === "string"
        ? data.projectId
        : "";
  const workspaceName =
    typeof data.workspaceName === "string"
      ? data.workspaceName
      : typeof data.projectName === "string"
        ? data.projectName
        : "";
  return {
    id,
    workspaceId,
    workspaceName,
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

export function createWorkspaceRepository(db: Firestore): WorkspaceRepository {
  async function createWorkspaceDoc(
    userId: string,
    name: string,
  ): Promise<string> {
    const workspaceRef = doc(collection(db, "workspaces"));
    await setDoc(workspaceRef, {
      name,
      ownerId: userId,
      members: [userId],
      createdAt: serverTimestamp(),
    });
    return workspaceRef.id;
  }

  return {
    async createPersonalWorkspace(userId: string) {
      return createWorkspaceDoc(userId, "Personal");
    },

    subscribeUserWorkspaces(
      userId: string,
      onWorkspaces: (workspaces: Workspace[]) => void,
    ) {
      const q = query(
        collection(db, "workspaces"),
        where("members", "array-contains", userId),
      );
      return onSnapshot(q, (snap) => {
        const workspaces = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) =>
            toWorkspace(d.id, d.data() as WorkspaceDoc),
        );
        onWorkspaces(workspaces);
      });
    },

    async createWorkspace(userId: string, name: string) {
      return createWorkspaceDoc(userId, name);
    },

    async deleteWorkspace(workspaceId: string) {
      await deleteDoc(doc(db, "workspaces", workspaceId));
    },

    async renameWorkspace(workspaceId: string, name: string) {
      await updateDoc(doc(db, "workspaces", workspaceId), { name });
    },

    async inviteMember(
      workspaceId: string,
      invitedByUserId: string,
      invitedByDisplayName: string,
      inviteeEmail: string,
    ) {
      const workspaceSnap = await getDoc(doc(db, "workspaces", workspaceId));
      const workspaceData = workspaceSnap.data() as WorkspaceDoc | undefined;
      const workspaceName =
        typeof workspaceData?.name === "string" ? workspaceData.name : "";

      const inviteRef = doc(
        collection(db, "invitesByEmail", inviteeEmail, "invites"),
      );
      const batch = writeBatch(db);
      batch.set(inviteRef, {
        workspaceId,
        workspaceName,
        invitedByUserId,
        invitedByDisplayName,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, "workspaces", workspaceId), {
        pendingInviteEmails: arrayUnion(inviteeEmail),
      });
      await batch.commit();
    },

    async removeMember(workspaceId: string, userIdToRemove: string) {
      await updateDoc(doc(db, "workspaces", workspaceId), {
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

      // Support both legacy projectId and new workspaceId field names
      const workspaceId = String(inviteData.workspaceId ?? inviteData.projectId);
      const batch = writeBatch(db);

      if (accept) {
        batch.update(inviteRef, { status: "accepted" });
        batch.update(doc(db, "workspaces", workspaceId), {
          members: arrayUnion(userId),
          pendingInviteEmails: arrayRemove(userEmail),
        });
      } else {
        batch.update(inviteRef, { status: "declined" });
        batch.update(doc(db, "workspaces", workspaceId), {
          pendingInviteEmails: arrayRemove(userEmail),
        });
      }

      await batch.commit();
    },

    subscribeInvites(
      userEmail: string,
      onInvites: (invites: WorkspaceInvite[]) => void,
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

    subscribeWorkspaceActivities(
      workspaceId: string,
      currentUserId: string,
      onActivities: (activities: ActivityNotification[]) => void,
    ) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, "workspaces", workspaceId, "activities"),
        where("createdAt", ">", Timestamp.fromDate(since)),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      return onSnapshot(q, (snap) => {
        const activities = snap.docs
          .map((d: QueryDocumentSnapshot<DocumentData>) =>
            toActivity(d.id, workspaceId, d.data() as ActivityDoc),
          )
          .filter((a) => a.actorUid !== currentUserId);
        onActivities(activities);
      });
    },

    async logActivity(
      workspaceId: string,
      activity: Omit<ActivityNotification, "id" | "createdAt" | "workspaceId">,
    ) {
      await addDoc(collection(db, "workspaces", workspaceId, "activities"), {
        ...activity,
        createdAt: serverTimestamp(),
      });
    },
  };
}
