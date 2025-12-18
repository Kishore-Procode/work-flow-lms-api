import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, SessionContentBlock } from '../../../infrastructure/repositories/WorkflowSessionRepository';

/**
 * GetSessionContentBlocksUseCase
 *
 * Retrieves all content blocks for a session.
 * Content blocks are ordered by order_index and include all content types
 * (video, text, pdf, image, audio, code, quiz, assignment, examination).
 *
 * Process:
 * 1. Validate session exists
 * 2. Fetch all content blocks from workflowmgmt.session_content_blocks
 * 3. Return ordered list of content blocks
 */

export interface GetSessionContentBlocksRequest {
  sessionId: string;
  userId: string; // For future authorization checks
}

export interface GetSessionContentBlocksResponse {
  sessionId: string;
  contentBlocks: Array<{
    id: string;
    sessionId: string;
    type: string;
    title: string;
    contentData: any;
    orderIndex: number;
    isRequired: boolean;
    estimatedTime: string | null;
    isActive: boolean;
  }>;
  totalBlocks: number;
  requiredBlocks: number;
}

export class GetSessionContentBlocksUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository
  ) {}

  async execute(request: GetSessionContentBlocksRequest): Promise<GetSessionContentBlocksResponse> {
    // Validate input
    if (!request.sessionId) {
      throw new DomainError('Session ID is required');
    }
    if (!request.userId) {
      throw new DomainError('User ID is required');
    }

    try {
      // Step 1: Validate session exists
      const session = await this.sessionRepository.getSessionById(request.sessionId);

      if (!session) {
        throw new DomainError('Session not found');
      }

      if (!session.isActive) {
        throw new DomainError('This session is not currently active');
      }

      // Step 2: Fetch content blocks
      const contentBlocks = await this.sessionRepository.getContentBlocksBySessionId(request.sessionId);

      // Step 3: Calculate statistics
      const requiredBlocks = contentBlocks.filter(block => block.isRequired).length;

      // Step 4: Return response
      return {
        sessionId: request.sessionId,
        contentBlocks: contentBlocks.map(block => ({
          id: block.id,
          sessionId: block.sessionId,
          type: block.type,
          title: block.title,
          contentData: block.contentData,
          orderIndex: block.orderIndex,
          isRequired: block.isRequired,
          estimatedTime: block.estimatedTime,
          isActive: block.isActive,
        })),
        totalBlocks: contentBlocks.length,
        requiredBlocks,
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get session content blocks: ${error.message}`);
    }
  }
}

