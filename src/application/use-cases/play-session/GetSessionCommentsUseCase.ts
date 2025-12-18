import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, SessionComment } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * GetSessionCommentsUseCase
 *
 * Retrieves all comments for a content block.
 * Comments are returned in reverse chronological order (newest first).
 *
 * Process:
 * 1. Validate content block exists
 * 2. Fetch all approved comments
 * 3. Return comments with user information
 */

export interface GetSessionCommentsRequest {
  contentBlockId: string;
  userId: string; // For future filtering/permissions
}

export interface GetSessionCommentsResponse {
  contentBlockId: string;
  comments: Array<{
    id: string;
    contentBlockId: string;
    userId: string;
    userName: string | null;
    commentText: string;
    parentCommentId: string | null;
    status: string;
    isAnonymous: boolean;
    likesCount: number;
    createdAt: Date;
    isActive: boolean;
  }>;
  totalComments: number;
}

export class GetSessionCommentsUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: GetSessionCommentsRequest): Promise<GetSessionCommentsResponse> {
    // Validate input
    if (!request.contentBlockId) {
      throw new DomainError('Content block ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }

    try {
      // Step 1: Validate content block exists
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);

      if (!contentBlock) {
        throw new DomainError('Content block not found');
      }

      // Step 2: Fetch comments
      const comments = await this.sessionRepository.getCommentsByBlockId(request.contentBlockId);

      // Step 3: Return response
      return {
        contentBlockId: request.contentBlockId,
        comments: comments.map(comment => ({
          id: comment.id,
          contentBlockId: comment.contentBlockId,
          userId: comment.userId,
          userName: comment.isAnonymous ? 'Anonymous' : comment.userName,
          commentText: comment.commentText,
          parentCommentId: comment.parentCommentId,
          status: comment.status,
          isAnonymous: comment.isAnonymous,
          likesCount: comment.likesCount,
          createdAt: comment.createdAt,
          isActive: comment.isActive,
        })),
        totalComments: comments.length,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get session comments: ${error.message}`);
    }
  }
}

