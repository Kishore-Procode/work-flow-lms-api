import { DomainError } from '../../../domain/errors/DomainError';
import { IWorkflowSessionRepository, SessionContentProgress } from '../../../infrastructure/repositories/WorkflowSessionRepository';
import { Pool } from 'pg';

/**
 * GetUserProgressUseCase
 *
 * Retrieves user's progress for all content blocks in a session.
 * Calculates overall completion percentage and statistics.
 *
 * Process:
 * 1. Validate session exists
 * 2. Fetch all content blocks for the session
 * 3. Fetch user's progress for each block
 * 4. Calculate completion statistics
 * 5. Return comprehensive progress data
 */

export interface GetUserProgressRequest {
  sessionId: string;
  userId: string;
  enrollmentId?: string; // Optional: for linking to LMS enrollment
}

export interface GetUserProgressResponse {
  sessionId: string;
  userId: string;
  progress: Array<{
    contentBlockId: string;
    contentBlockTitle: string;
    contentBlockType: string;
    isCompleted: boolean;
    timeSpent: number; // seconds
    completionData: any | null;
    completedAt: Date | null;
  }>;
  statistics: {
    totalBlocks: number;
    completedBlocks: number;
    requiredBlocks: number;
    completedRequiredBlocks: number;
    completionPercentage: number;
    totalTimeSpent: number; // seconds
  };
}

export class GetUserProgressUseCase {
  constructor(
    private readonly sessionRepository: IWorkflowSessionRepository,
    private readonly pool: Pool
  ) {}

  async execute(request: GetUserProgressRequest): Promise<GetUserProgressResponse> {
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

      // Step 2: Fetch all content blocks
      const contentBlocks = await this.sessionRepository.getContentBlocksBySessionId(request.sessionId);

      // Step 3: Fetch user's progress
      const userProgress = await this.sessionRepository.getUserProgressBySession(
        request.userId,
        request.sessionId
      );

      // Create a map for quick lookup
      const progressMap = new Map(
        userProgress.map(p => [p.contentBlockId, p])
      );

      // Step 4: Build progress array with block details
      const progressArray = contentBlocks.map(block => {
        const progress = progressMap.get(block.id);
        return {
          contentBlockId: block.id,
          contentBlockTitle: block.title,
          contentBlockType: block.type,
          isCompleted: progress?.isCompleted || false,
          timeSpent: progress?.timeSpent || 0,
          completionData: progress?.completionData || null,
          completedAt: progress?.completedAt || null,
        };
      });

      // Step 5: Calculate statistics
      const totalBlocks = contentBlocks.length;
      const completedBlocks = progressArray.filter(p => p.isCompleted).length;
      const requiredBlocks = contentBlocks.filter(b => b.isRequired).length;
      const completedRequiredBlocks = contentBlocks
        .filter(b => b.isRequired)
        .filter(b => progressMap.get(b.id)?.isCompleted).length;
      
      const completionPercentage = requiredBlocks > 0
        ? Math.round((completedRequiredBlocks / requiredBlocks) * 100)
        : 0;

      const totalTimeSpent = progressArray.reduce((sum, p) => sum + p.timeSpent, 0);

      return {
        sessionId: request.sessionId,
        userId: request.userId,
        progress: progressArray,
        statistics: {
          totalBlocks,
          completedBlocks,
          requiredBlocks,
          completedRequiredBlocks,
          completionPercentage,
          totalTimeSpent,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError(`Failed to get user progress: ${error.message}`);
    }
  }
}

