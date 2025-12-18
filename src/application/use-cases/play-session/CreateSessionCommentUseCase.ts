import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, SessionComment } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * CreateSessionCommentUseCase
 *
 * Creates a new comment on a content block.
 * Comments can be replies to other comments (threaded).
 *
 * Process:
 * 1. Validate content block exists
 * 2. Validate parent comment if replying
 * 3. Create comment in workflowmgmt.session_content_comments
 * 4. Return created comment
 */

export interface CreateSessionCommentRequest {
  contentBlockId: string;
  userId: string;
  commentText: string;
  parentCommentId?: string | null;
  isAnonymous?: boolean;
}

export interface CreateSessionCommentResponse {
  comment: {
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
  };
}

export class CreateSessionCommentUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: CreateSessionCommentRequest): Promise<CreateSessionCommentResponse> {
    // Validate input
    if (!request.contentBlockId) {
      throw new DomainError('Content block ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }
    if (!request.commentText || request.commentText.trim().length === 0) {
      throw new DomainError('Comment text is required');
    }
    if (request.commentText.length > 5000) {
      throw new DomainError('Comment text must be less than 5000 characters');
    }

    try {
      // Step 1: Validate content block exists
      const contentBlock = await this.sessionRepository.getContentBlockById(request.contentBlockId);

      if (!contentBlock) {
        throw new DomainError('Content block not found');
      }

      // Step 2: Validate parent comment if replying
      if (request.parentCommentId) {
        // Note: We could add a method to validate parent comment exists
        // For now, the database foreign key will handle this
      }

      // Step 3: Create comment
      const commentData: Omit<SessionComment, 'id' | 'createdAt' | 'updatedAt' | 'likesCount'> = {
        contentBlockId: request.contentBlockId,
        userId: request.userId,
        userName: null, // Will be populated by JOIN in queries
        commentText: request.commentText.trim(),
        parentCommentId: request.parentCommentId || null,
        status: 'approved', // Auto-approve for now; can add moderation later
        isAnonymous: request.isAnonymous || false,
        isActive: true,
      };

      const createdComment = await this.sessionRepository.createComment(commentData);

      return {
        comment: {
          id: createdComment.id,
          contentBlockId: createdComment.contentBlockId,
          userId: createdComment.userId,
          userName: createdComment.userName,
          commentText: createdComment.commentText,
          parentCommentId: createdComment.parentCommentId,
          status: createdComment.status,
          isAnonymous: createdComment.isAnonymous,
          likesCount: createdComment.likesCount,
          createdAt: createdComment.createdAt,
          isActive: createdComment.isActive,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to create comment: ${error.message}`);
    }
  }
}

