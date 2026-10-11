import type { Comment, CommentTarget } from '../models/comment';
import type { Unsubscribe } from './types';

export interface CommentRepository {
  subscribeComments(
    target: CommentTarget,
    itemId: string,
    onComments: (comments: Comment[]) => void,
  ): Unsubscribe;
  addComment(
    target: CommentTarget,
    itemId: string,
    comment: Pick<Comment, 'body' | 'authorId' | 'authorDisplayName'>,
  ): Promise<string>;
  updateComment(
    target: CommentTarget,
    itemId: string,
    commentId: string,
    body: string,
  ): Promise<void>;
  deleteComment(
    target: CommentTarget,
    itemId: string,
    commentId: string,
  ): Promise<void>;
}
