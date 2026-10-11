export interface Note {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorDisplayName: string;
  createdAt: string;
  updatedAt: string;
  /** Pinned notes sort above the rest. */
  pinned?: boolean;
}
