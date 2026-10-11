export type CommentTarget = 'habit' | 'task';

export interface Comment {
  id: string;
  body: string;
  authorId: string;
  authorDisplayName: string;
  createdAt: string;
  updatedAt: string;
}
