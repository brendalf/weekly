import {
  type Firestore,
  type DocumentData,
  type QueryDocumentSnapshot,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import type {
  Comment,
  CommentRepository,
  CommentTarget,
} from "@weekly/domain";

type CommentDoc = {
  body?: unknown;
  authorId?: unknown;
  authorDisplayName?: unknown;
  createdAt?: { toDate?: () => Date };
  updatedAt?: { toDate?: () => Date };
};

function toComment(id: string, data: CommentDoc): Comment {
  return {
    id,
    body: typeof data.body === "string" ? data.body : "",
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorDisplayName:
      typeof data.authorDisplayName === "string" ? data.authorDisplayName : "",
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

export function createCommentRepository(
  db: Firestore,
  workspaceId: string,
): CommentRepository {
  function commentsCol(target: CommentTarget, itemId: string) {
    return collection(
      db,
      "workspaces",
      workspaceId,
      target === "habit" ? "habits" : "tasks",
      itemId,
      "comments",
    );
  }

  return {
    subscribeComments(
      target: CommentTarget,
      itemId: string,
      onComments: (comments: Comment[]) => void,
    ) {
      const q = query(
        commentsCol(target, itemId),
        orderBy("createdAt", "asc"),
      );
      return onSnapshot(q, (snap) => {
        const comments = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) =>
            toComment(d.id, d.data() as CommentDoc),
        );
        // A just-added doc still has a pending serverTimestamp, which reads as
        // null locally and would sort ahead of everything in the ascending
        // query. Re-sort on the mapped value (pending docs fall back to "now")
        // so a new comment lands at the end instead of jumping to the top.
        comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        onComments(comments);
      });
    },

    async addComment(
      target: CommentTarget,
      itemId: string,
      comment: Pick<Comment, "body" | "authorId" | "authorDisplayName">,
    ) {
      const ref = await addDoc(commentsCol(target, itemId), {
        ...comment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },

    async updateComment(
      target: CommentTarget,
      itemId: string,
      commentId: string,
      body: string,
    ) {
      await updateDoc(doc(commentsCol(target, itemId), commentId), {
        body,
        updatedAt: serverTimestamp(),
      });
    },

    async deleteComment(
      target: CommentTarget,
      itemId: string,
      commentId: string,
    ) {
      await deleteDoc(doc(commentsCol(target, itemId), commentId));
    },
  };
}
